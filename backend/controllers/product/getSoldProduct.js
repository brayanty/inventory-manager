import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import pool from "../../config/db.js";
import { testDate } from "../../utils/validateDate.js";

// Obtener productos con paginación y búsqueda
export async function getSoldProduct(req, res) {
  const { page = 1, limit = 10, date1, date2 } = req.query;

  // Valida las fechas
  if (!testDate.test(date1) || !testDate.test(date2)) {
    return handleError(req, res, "Las fechas no son correctas", 409);
  }
  // Valida que limit no se un numero mayor a 100
  if (isNaN(page) || isNaN(limit) || limit > 100 || page < 1)
    return handleError(
      req,
      res,
      "El numero de pagina no es valido o limite excede el valor de 100",
      404,
      `page = ${page} limit = ${limit}`,
    );

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  let where = `WHERE sold_at >= $1::date AND sold_at < $2::date + INTERVAL '1 day'`;
  let params = [date1, date2];

  try {
    // Total de registros
    const countQuery = `
      SELECT COUNT(*) 
      FROM soldProduct
      ${where}
    `;

    const totalResult = await pool.query(countQuery, params);
    const totalItems = parseInt(totalResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limitNum);

    // Datos paginados
    const dataQuery = `
      SELECT *
      FROM soldProduct
      ${where}
      ORDER BY sold_at DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    const dataParams = [...params, limitNum, offset];
    const soldProductQuery = await pool.query(dataQuery, dataParams);

    if (soldProductQuery.rowCount == 0) {
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
    console.log(error);
    return handleError(req, res, "Error del servidor", 500);
  }
}
