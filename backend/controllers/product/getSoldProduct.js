import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import pool from "../../config/db.js";
import { testDate } from "../../utils/validateDate.js";

// Obtener productos con paginación y búsqueda
export async function getSoldProduct(req, res) {
  const { page = 1, limit = 10, date } = req.query;

  if (!date || !testDate.test(date)) {
    return handleError(req, res, "La fecha no es correcta", 409);
  }

  if (isNaN(page) || isNaN(limit) || limit > 100 || page < 1) {
    return handleError(
      req,
      res,
      "El numero de pagina no es valido o limite excede el valor de 100",
      404,
    );
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const where = `WHERE s.sold_at <= $1::date 
                 AND s.sold_at >= $1::date - INTERVAL '1 month'`;

  const params = [date];

  try {
    const countQuery = `
      SELECT COUNT(*) 
      FROM soldProduct s
      ${where}
    `;

    const totalResult = await pool.query(countQuery, params);
    const totalItems = parseInt(totalResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limitNum);

    const dataQuery = `
      SELECT 
        s.*,
        p.name AS product_name
      FROM soldProduct s
      JOIN product p ON p.id = s.product_id
      ${where}
      ORDER BY s.sold_at DESC
      LIMIT $2
      OFFSET $3
    `;

    const soldProductQuery = await pool.query(dataQuery, [
      ...params,
      limitNum,
      offset,
    ]);

    if (soldProductQuery.rowCount === 0) {
      return handleError(req, res, "No se encontraron datos de venta", 404);
    }

    return handleSuccess(req, res, {
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages,
      soldProduct: soldProductQuery.rows,
    });
  } catch (error) {
    console.error(error);
    return handleError(req, res, "Error del servidor", 500);
  }
}
