import pool from "../../config/db.js";
import { FILES } from "../../config/file.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import { readData } from "../../utils/file.js";

export async function createProduct(req, res) {
  const { name, category, sales } = req.body;

  const price = parseFloat(req.body.price);
  const stock = parseInt(req.body.total);
  const categoriesList = await readData(FILES.CATEGORIES);
  const categoryExists = categoriesList.find(
    (cat) => cat.category === category
  );

  if (!categoryExists) {
    return handleError(req, res, "La categoría proporcionada no existe", 400);
  }

  if (isNaN(price) || price < 0) {
    return handleError(
      req,
      res,
      "El precio debe ser un número válido y no negativo"
    );
  }

  if (!name || typeof name !== "string" || name.trim() === "")
    return handleError(
      req,
      res,
      "El campo 'name' debe ser una cadena no vacía",
      400
    );

  if (stock == null || typeof stock !== "number" || isNaN(stock) || stock < 0)
    return handleError(
      req,
      res,
      "El campo 'stock' debe ser un número válido y no negativo"
    );

  const result = await pool.query(
    `INSERT INTO products (name, category, price, stock, sales)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
    [name, category, price, stock ?? 0, sales ?? null]
  );

  if (result.rows.length > 0) {
    return handleSuccess(req, res, result.rows[0], 201);
  }

  return handleError(req, res, "Error al crear el producto", 500);
}
