import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import pool from "../../config/db.js";
import { allowedFields } from "../../constants/product.const.js";

// Función para editar un producto
// Falta agregar la función para validar las categorias
// HAY QUE USAR ZOD PARA VALIDAR LOS DATOS DE ENTRADA, PERO POR AHORA SE HACE MANUALMENTE
export async function updateProduct(req, res) {
  const fields = req.body;
  const { id } = req.params;

  // Valida que los fields en existan
  const keys = Object.keys(fields).filter((k) => allowedFields.includes(k));
  // Valida que la keys no este vacia
  if (keys.length === 0)
    return handleError(
      req,
      res,
      "No se encuentran datos validos para actulizar",
    );

  // Validar longitud de campos
  if (fields.name && fields.name.length > 250)
    return handleError(
      req,
      res,
      "El nombre del producto no puede exceder 250 caracteres",
      400,
    );

  const setQuery = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
  const values = keys.map((k) => fields[k]);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rowCount, rows } = await client.query(
      `
      UPDATE product
      SET ${setQuery}
      WHERE id = $${keys.length + 1}
      RETURNING *
      `,
      [...values, id],
    );

    if (rowCount === 0) {
      await client.query("ROLLBACK");
      return handleError(req, res, "Producto no encontrado", 404);
    }

    await client.query("COMMIT");
    return handleSuccess(req, res, rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    handleError(req, res, "Error al actualizar el producto", 404, err);
  } finally {
    client.release();
  }
}
