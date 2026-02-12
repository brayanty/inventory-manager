import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import pool from "../../config/db.js";

export default async function createCategory(req, res) {
  let { category } = req.body;

  category = category.trim().toLowerCase();

  const client = await pool.connect();

  try {
    const existingCategoryCheck = await client.query(
      "SELECT * FROM category WHERE category = $1",
      [category],
    );

    if (existingCategoryCheck.rows.length > 0) {
      return handleError(req, res, "La categoría ya existe", 404);
    }

    await client.query(
      "CREATE TABLE IF NOT EXISTS category(id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, category VARCHAR(250))",
    );

    const existingCategory = await client.query(
      "SELECT * FROM category WHERE category = $1",
      [category],
    );

    if (existingCategory.rows.length > 0) {
      return handleError(req, res, "La categoría ya existe", 404);
    }

    const newCategory = await client.query(
      "INSERT INTO category(category) VALUES($1) RETURNING *",
      [category],
    );

    handleSuccess(
      req,
      res,
      newCategory.rows[0],
      "Categoría creada exitosamente",
      201,
    );
  } catch (err) {
    console.error(err);
    handleError(req, res, "Error al guardar la categoría");
  }
}
