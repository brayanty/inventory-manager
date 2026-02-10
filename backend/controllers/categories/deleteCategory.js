import { handleError, handleSuccess } from "../../modules/handleResponse.js";

export default async function deleteCategory(req, res) {
  const CategoryID = req.params.id;
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      "UPDATE category SET deleted_at = NOW() WHERE id = $1 RETURNING *",
      [CategoryID],
    );

    if (rows.length === 0) {
      return handleError(req, res, `La categoria ${CategoryID} no existe`, 406);
    }

    handleSuccess(req, res, rows[0], "Categoría eliminada", 200);
  } catch (err) {
    console.error(err);
    handleError(req, res, "Error al eliminar la categoría", 500);
  } finally {
    client.release();
  }
}
