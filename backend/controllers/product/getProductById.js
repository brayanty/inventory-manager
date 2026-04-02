import pool from "../../config/db.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import { getProducts } from "../../repositories/product.repository.js";

export async function getProductById(req, res) {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    const { rows } = await getProducts(client, [{ id: id }]);

    return handleSuccess(req, res, rows[0]);
  } catch (error) {
    console.error(error);
    return handleError(req, res, "Error al obtener el producto");
  } finally {
    client.release();
  }
}
