import pool from "../../config/db.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";

export async function getProduct(req, res) {
  const { search, page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    // condición base
    let whereConditions = ["deleted_at IS NULL"];
    let params = [];

    // condición en caso de que search no este basio
    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`name ILIKE $${params.length}`);
    }

    // union de las condiciones separado por "AND"
    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    const productsQuery = `
      SELECT *
      FROM products
      ${whereClause}
      ORDER BY id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM products
      ${whereClause};
    `;

    const [productsResult, countResult] = await Promise.all([
      pool.query(productsQuery, [...params, limitNum, offset]),
      pool.query(countQuery, params),
    ]);

    const totalItems = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalItems / limitNum);

    return handleSuccess(req, res, {
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages,
      products: productsResult.rows,
    });
  } catch (error) {
    console.error(error);
    return handleError(req, res, "Error al leer los productos");
  }
}
