import pool from "../config/db.js";
import logger from "../config/logger.js";
import * as deviceRepo from "../repositories/device.repository.js";
import * as productRepo from "../repositories/product.repository.js";
import { postTechnicalServicePrinter } from "./printerService.js";

async function createDevice(deviceData, files) {
  const imageNames = files ? files.map((f) => f.filename) : [];
  const client = await pool.connect();
  //Insertar quantity 1 a las fallas
  //QUIZAS SE PUDE HACER DE MEJOR MANERA "No se como"
  const clientFaults = deviceData.faults.map((f) => ({
    id: f.id,
    quantity: 1,
  }));

  try {
    await client.query("BEGIN");

    // Validar productos
    const { rows: faultsDB, rowCount } = await productRepo.getValidProducts(
      client,
      clientFaults,
    );

    // Actualizar stock de productos
    const faultsDecrement = await productRepo.decrementStock(
      client,
      clientFaults,
    );

    if (
      rowCount !== deviceData.faults.length ||
      faultsDecrement.length !== deviceData.faults.length
    ) {
      const error = new Error("Algunas fallas no existen o no tienen stock");
      error.status = 400;
      throw error;
    }
    // Calcular totales
    const sparePartsTotal = faultsDB.reduce(
      (acc, p) => acc + parseFloat(p.price),
      0,
    );

    const repairPrice = Number(deviceData.price) || 0;
    const repairPricePay = Number(deviceData.price_pay) || 0;

    // El precio total debe cubrir al menos el subtotal de repuestos
    if (repairPrice < sparePartsTotal) {
      const error = new Error(
        `El precio total debe ser al menos el subtotal de repuestos (${sparePartsTotal})`,
      );
      error.status = 400;
      throw error;
    }

    // Validar que el pago no sobrepase el precio total
    if (repairPricePay > repairPrice) {
      const error = new Error(
        `El pago sobre pasa el precio. El precio total es ${repairPrice}`,
      );
      error.status = 400;
      throw error;
    }
    // Preparar datos para generar reparación
    const device = {
      ...deviceData,
      images: imageNames.map((name) => `/img/devices/${name}`),
      faults: faultsDB.map((f) => ({
        id: f.id,
        price: f.price,
        quantity: 1,
      })),
    };
    // Insertar device
    const newDevice = await deviceRepo.insertDevice(client, device);
    // Guardar historial
    await deviceRepo.insertHistoryTicket(
      client,
      newDevice.id,
      faultsDB,
      repairPrice,
    );
    await client.query("COMMIT");

    // Impresión del ticket
    const statusPrinter = await postTechnicalServicePrinter({
      name: newDevice.client_name,
      device: newDevice.device,
      model: newDevice.model,
      //Provisionalmente esto se cambiara cuando aprenda mas postgres
      pay: newDevice.price_pay === newDevice.price ? true : false,
      price: newDevice.price,
      pricePay: newDevice.price_pay,
      qr: `{id: ${newDevice.id}, name: "${newDevice.client_name}", device: "${newDevice.device}"}`,
      faults: faultsDB,
    });

    return { device: newDevice, statusPrinter };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateDevice(updateDeviceFields, deviceID) {
  const client = await pool.connect();
  const device = await deviceRepo.getDeviceByID(client, deviceID);

  if (!device || device.repair_status === "Entregado") {
    const error = new Error("Dispositivo no encontrado o ya entregado");
    error.status = 400;
    throw error;
  }
  const keys = Object.keys(updateDeviceFields).filter((key) => key);
  if (keys.length < 1) {
    const error = new Error("No hay datos validos para actualizar");
    error.status = 400;
    throw error;
  }

  const setQuery = keys.map((key, i) => `${key}= $${i + 1}`).join(", ");
  const values = keys.map((k) =>
    k === "faults"
      ? JSON.stringify(updateDeviceFields[k])
      : updateDeviceFields[k],
  );

  try {
    const { rowCount, rows } = await deviceRepo.insertDeviceUpdate(
      client,
      setQuery,
      keys,
      values,
      deviceID,
    );

    if (rowCount < 1) {
      const error = new Error("Dispositivo no encontrado");
      error.status = 400;
      throw error;
    }
    return { device: rows[0], rowCount: rowCount };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function updateDeliveredDevice(status, deviceID) {
  const client = await pool.connect();
  const device = await deviceRepo.getDeviceByID(client, deviceID);

  if (!device) {
    const error = new Error("Dispositivo no encontrado");
    error.status = 404;
    throw error;
  }

  try {
    await client.query("BEGIN");

    let result;
    if (device.repair_status === "Reparado" && device.pay) {
      result = await deviceRepo.updateDeviceStatusPay(client, deviceID, status);
    } else if (
      device.repair_status === "Sin Solución" ||
      device.repair_status === "Reparado"
    ) {
      result = await deviceRepo.updateDeviceStatusNoPay(
        client,
        deviceID,
        status,
      );
    } else {
      const error = new Error(
        "No se puede entregar un dispositivo en revisión o ya entregado",
      );
      error.status = 400;
      throw error;
    }

    // Validación unificada
    if (result.rowCount < 1) {
      const error = new Error("Dispositivo no actualizado");
      error.status = 400;
      throw error;
    }

    // Commit y retorno unificados
    await client.query("COMMIT");
    return { ...result.rows[0] };
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error("Error en updateDeliveredDevice:", err);
    throw err;
  } finally {
    client.release();
  }
}

export default {
  createDevice,
  updateDevice,
  updateDeliveredDevice,
};
