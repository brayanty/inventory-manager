import pool from "../../config/db.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";

export async function getTopSold(req, res) {
  const client = await pool.connect();
  const limit = parseInt(req.query.limit) || 10;
  if (limit <= 0) {
    return handleError(req, res, "El límite debe ser un número positivo", 400);
  }
  try {
    const topSoldProducts = await client.query(
      "SELECT p.id, p.name, SUM(sp.sales) AS sales FROM soldProduct sp JOIN product p ON sp.product_id = p.id GROUP BY p.id ORDER BY sales DESC LIMIT $1",
      [limit],
    );
    handleSuccess(req, res, topSoldProducts.rows);
  } catch (error) {
    console.error(error);
    handleError(req, res, "Error al obtener los productos más vendidos", 500);
  }
}
