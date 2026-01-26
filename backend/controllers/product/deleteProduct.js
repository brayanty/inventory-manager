import pool from "../../config/db.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";

export async function deleteProduct(req, res) {
  const productID = req.params.id;

  try {
    if (productID == null)
      return handleError(req, res, "El id esta vacío o inexistente");

    const result = await pool.query(
      "UPDATE products SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *",
      [productID],
    );

    if (result.rowCount === 0) {
      return handleError(req, res, "Producto no encontrado o ya borrado", 404);
    }

    handleSuccess(req, res, result.rows[0], "Producto borrado");
  } catch (error) {
    console.error(error);
    return handleError(req, res, "Error al eliminar el producto");
  }
}
