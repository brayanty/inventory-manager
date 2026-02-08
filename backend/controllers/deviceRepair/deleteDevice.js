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
      throw new Error("ROLLBACK");
    }

    await client.query("COMMIT");
    return handleSuccess(req, res, deviceID, "Dispositivo eliminado");
  } catch (err) {
    console.log(err);
    if (err.messege == "ROLLBACK") {
      await client.query("ROLLBACK");
      handleError(req, res, "El dispositivo no existe");
    }
    return handleError(req, res, "Error al eliminar el dispositivo");
  } finally {
    client.release();
  }
}
