import pool from "../../config/db.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";

export async function createProduct(req, res) {
  const { name, category } = req.body;

  const price = parseFloat(req.body.price);
  const stock = parseInt(req.body.stock);
  const client = await pool.connect();

  try {
    const { rows: categoriesList } = await client.query(
      "SELECT * FROM category WHERE deleted_at IS NULL",
    );
    const categoryExists = categoriesList.find(
      (cat) => cat.category === category,
    );

    if (!categoryExists) {
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
      [name, category, price, stock ?? 0],
    );

    if (result.rows.length > 0) {
      return handleSuccess(req, res, result.rows[0], 201);
    }
  } catch (err) {
    console.error(err);
    return handleError(req, res, "Error al crear el producto", 500);
  } finally {
    client.release();
  }
}
