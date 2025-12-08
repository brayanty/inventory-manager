import pool from "../../config/db.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";

export async function getProduct(req, res) {
  const { search, page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const offset = (pageNum - 1) * limitNum;

  try {
    let where = "";
    let params = [];

    if (search) {
      where = "WHERE name ILIKE $1";
      params.push(`%${search}%`);
    }

    const productsQuery = `
      SELECT *
      FROM products
      ${where}
      ORDER BY id DESC
      LIMIT ${limitNum} OFFSET ${offset};
    `;

    const products = await pool.query(productsQuery, params);

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM products
      ${where};
    `;

    const total = await pool.query(countQuery, params);

    const totalItems = parseInt(total.rows[0].total);
    const totalPages = Math.ceil(totalItems / limitNum);

    return handleSuccess(req, res, {
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages,
      products: products.rows,
    });
  } catch (error) {
    console.error(error);
    return handleError(req, res, "Error al leer los productos");
  }
}
