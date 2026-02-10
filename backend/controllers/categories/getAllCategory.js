import pool from "../../config/db.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";

export default async function getAllCategory(req, res) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      "SELECT * FROM category WHERE deleted_at IS NULL",
    );
    handleSuccess(req, res, rows);
  } catch (err) {
    console.error(err);
    handleError(req, res, "No se pudo obtener las categorias");
  } finally {
    client.release();
  }
}
