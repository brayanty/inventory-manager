import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import pool from "../../config/db.js";

const repairCategoryAvailable = ["repuesto", "display", "servicio"];

export default async function getRepairs(req, res) {
  const search = req.query.search;
  if (!search) {
    return handleError(req, res, "El parámetro de búsqueda está vacío", 404);
  }

  const client = await pool.connect();
  try {
    const queryRepairs =
      "SELECT * FROM product WHERE (category = $1 OR category = $2 OR category = $3) AND name ILIKE $4 AND deleted_at IS NULL AND stock >= 1 ";

    const { rows, rowCount } = await client.query(queryRepairs, [
      ...repairCategoryAvailable,
      `%${search}%`,
    ]);
    console.log(rows);
    if (rowCount <= 0) {
      return handleError(
        req,
        res,
        "No se encontraron resultados para la búsqueda",
        404,
      );
    }

    handleSuccess(req, res, rows);
  } catch (err) {
    console.error("Error al leer las reparaciones disponibles:", err);
    handleError(req, res, "Error al leer las reparaciones disponibles", 500);
  }
}
