import pool from "../config/db.js";
import * as deviceRepo from "../repositories/device.repository.js";
import * as productRepo from "../repositories/product.repository.js";
import { postTechnicalServicePrinter } from "./printerService.js";

async function createDevice(data) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Validar productos
    const faultIds = data.faults.map((f) => f.id);

    const validProducts = await productRepo.getValidProducts(client, faultIds);

    if (validProducts.length !== data.faults.length) {
      const error = new Error("Algunas fallas no existen o no tienen stock");
      error.status = 400;
      throw error;
    }
    // Calcular total
    const totalPrice = validProducts.reduce(
      (acc, p) => acc + parseFloat(p.price),
      0,
    );
    // Validar que el pago no sobrepase el total
    if (data.price_pay > totalPrice) {
      const error = new Error(
        `El pago sobre pasa el precio. El precio total es ${totalPrice}`,
      );
      error.status = 400;
      throw error;
    }

    // Actualizar stock de productos
    await productRepo.decrementStock(client, faultIds);

    // Insertar device
    const device = await deviceRepo.insertDevice(client, data);

    // Guardar historial
    await deviceRepo.insertHistoryTicket(
      client,
      device.id,
      validProducts,
      totalPrice,
    );

    await client.query("COMMIT");

    // Impresión del ticket
    const statusPrinter = await postTechnicalServicePrinter(
      {
        name: device.client_name,
        device: device.device,
        model: device.model,
        pay: device.pay,
        pricePay: device.price_pay,
        id: device.id,
      },
      validProducts,
    );

    return { device, statusPrinter };
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
  console.log(values);

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

export default {
  createDevice,
  updateDevice,
};
