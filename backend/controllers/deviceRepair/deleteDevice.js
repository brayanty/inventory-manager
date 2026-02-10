import pool from "../../config/db.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";

export default async function deleteDevice(req, res) {
  const deviceID = req.params.id;
  if (isNaN(deviceID) && !deviceID) {
    return handleError(req, res, "No se proporciono un id valido");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      "UPDATE device SET deleted_at = NOW() WHERE id = $1 RETURNING*",
      [deviceID],
    );
    if (rows.length != 1) {
      return handleError(req, res, `El dispositivo ${deviceID} no existe`, 406);
    }

    await client.query("COMMIT");
    return handleSuccess(req, res, deviceID, "Dispositivo eliminado");
  } catch (err) {
    await client.query("ROLLBACK");
    return handleError(req, res, "Error al eliminar el dispositivo", 500);
  } finally {
    client.release();
  }
}
