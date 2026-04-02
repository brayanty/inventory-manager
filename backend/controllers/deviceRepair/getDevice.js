import pool from "../../config/db.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import { getDeviceByID } from "../../repositories/device.repository.js";

export default async function getDevice(req, res) {
  const deviceID = req.params.id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const device = await getDeviceByID(client, deviceID);

    await client.query("COMMIT");
    handleSuccess(req, res, device);
  } catch (err) {
    console.error(err);
    handleError(req, res, "Error al leer la entrada");
  } finally {
    client.release();
  }
}
