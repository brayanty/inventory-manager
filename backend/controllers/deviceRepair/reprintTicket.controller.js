import pool from "../../config/db.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import { getDeviceByID } from "../../repositories/device.repository.js";
import { postTechnicalServicePrinter } from "../../services/printerService.js";
import * as productRepo from "../../repositories/product.repository.js";

export async function reprintTicketDevice(req, res) {
  const deviceID = req.params.id;
  if (!deviceID) {
    return handleError(req, res, "El dispositivo es invalido");
  }

  const client = await pool.connect();
  try {
    const device = await getDeviceByID(client, deviceID);
    const { rows: fautlsDB, rowCount } = await productRepo.getProducts(
      client,
      device.faults,
    );

    if (rowCount < 0) {
      handleError(req, res, "No hay datos de esta reparación", 404);
    }

    // Impresión del ticket
    const statusPrinter = await postTechnicalServicePrinter({
      name: device.client_name,
      device: device.device,
      model: device.model,
      //Provisionalmente esto se cambiara cuando aprenda mas postgres
      pay: device.price_pay === device.price,
      price: device.price,
      pricePay: device.price_pay,
      id: device.id,
      faults: fautlsDB,
    });

    if (!statusPrinter.success) {
      return handleError(req, res, statusPrinter.message, 404);
    }

    if (statusPrinter.success) {
      return handleSuccess(req, res, deviceID, statusPrinter.message, 200);
    }
  } catch (err) {
    await client.query("ROLLBACK");
    return handleError(req, res, "Error al re-imprimir el dispositivo", 500);
  } finally {
    client.release();
  }
}
