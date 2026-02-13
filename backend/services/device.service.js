import pool from "../config/db.js";
import * as deviceRepo from "../repositories/device.repository.js";
import * as productRepo from "../repositories/product.repository.js";
import { postTechnicalServicePrinter } from "./printerService.js";

async function createDevice(data) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Validar productos
    const faultIds = data.faults.map((f) => f.id);

    const validProducts = await productRepo.getValidProducts(client, faultIds);

    if (validProducts.length !== data.faults.length) {
      const error = new Error("Algunas fallas no existen o no tienen stock");
      error.status = 400;
      throw error;
    }
    // Actualizar stock de productos
    await productRepo.decrementStock(client, faultIds);

    // Insertar device
    const device = await deviceRepo.insertDevice(client, data);

    // Calcular total
    const totalPrice = validProducts.reduce(
      (acc, p) => acc + parseFloat(p.price),
      0,
    );
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

export default {
  createDevice,
};
