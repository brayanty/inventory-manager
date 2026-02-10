import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import { deviceFieldsAllowed } from "../../constants/device.const.js";
import pool from "../../config/db.js";

export default async function updateDevice(req, res) {
  const { id: deviceID } = req.params;
  const updateFields = req.body;

  const keys = Object.keys(updateFields).filter((key) =>
    deviceFieldsAllowed.includes(key),
  );

  if (keys.length < 1) {
    return handleError(req, res, "No hay datos validos para actualizar");
  }

  const setQuery = keys.map((key, i) => `${key}= $${i + 1}`).join(", ");
  const values = keys.map((k) =>
    k === "faults" ? JSON.stringify(updateFields[k]) : updateFields[k],
  );

  const client = await pool.connect();
  try {
    const queryDevice = `UPDATE device SET ${setQuery} WHERE id = $${keys.length + 1} RETURNING *`;

    const { rows, rowCount } = await client.query(queryDevice, [
      ...values,
      deviceID,
    ]);

    if (rowCount < 1) {
      return handleError(req, res, "No se encontro el producto", 404);
    }

    handleSuccess(req, res, rows[0]);
  } catch (err) {
    console.error(err);
    handleError(req, res, "Error al actualizar el dispositivo");
  }
}
