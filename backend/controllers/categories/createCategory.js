import { handleError, handleSuccess } from "../../modules/handleResponse.js";

export default async function createCategory(req, res) {
  const { category } = req.body;

  category = category.trim().toLowerCase();

  const client = await pool.connect();

  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS category(id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, category VARCHAR(250))",
    );

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
