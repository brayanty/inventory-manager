import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import pool from "../../config/db.js";
import { validCategories } from "../../repositories/product.repository.js";

export default async function createCategory(req, res) {
  let { name } = req.body;
  if (!name) {
    return handleError(req, res, "No se recibieron datos validos");
  }
  name = name.trim().toLowerCase();

  const client = await pool.connect();

  try {
    const existingCategory = await validCategories(client, name);

    if (existingCategory) {
      return handleError(req, res, "La categoría ya existe", 404);
    }

    await client.query(
      "CREATE TABLE IF NOT EXISTS category(id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name VARCHAR(250))",
    );

    const newCategory = await client.query(
      "INSERT INTO category(name) VALUES($1) RETURNING *",
      [name],
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
