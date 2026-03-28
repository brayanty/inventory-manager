import pool from "../../config/db.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import { validCategories } from "../../repositories/product.repository.js";

export async function createProduct(req, res) {
  const { name } = req.body;
  let { category } = req.body;

  const price = parseFloat(req.body.price);
  const stock = parseInt(req.body.stock);
  const client = await pool.connect();

  try {
    // Normalizar categoría a minúsculas
    category = category.trim().toLowerCase();

    const existCategory = await validCategories(client, category);

    if (!existCategory) {
      return handleError(req, res, "La categoría proporcionada no existe", 400);
    }

    if (isNaN(price) || price < 0) {
      return handleError(
        req,
        res,
        "El precio debe ser un número válido y no negativo",
      );
    }

    if (!name || typeof name !== "string" || name.trim() === "")
      return handleError(
        req,
        res,
        "El campo 'name' debe ser una cadena no vacía",
        400,
      );

    if (name.length > 250)
      return handleError(
        req,
        res,
        "El nombre del producto no puede exceder 250 caracteres",
        400,
      );

    if (stock == null || typeof stock !== "number" || isNaN(stock) || stock < 0)
      return handleError(
        req,
        res,
        "El campo 'stock' debe ser un número válido y no negativo",
      );

    const result = await client.query(
      `INSERT INTO product (name, category, price, stock)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, category, price, stock],
    );

    if (result.rows.length > 0) {
      return handleSuccess(
        req,
        res,
        result.rows[0],
        "Producto creado exitosamente",
        201,
      );
    }
  } catch (err) {
    console.error(err);
    return handleError(req, res, "Error al crear el producto", 500);
  } finally {
    client.release();
  }
}
