import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import pool from "../../config/db.js";

export default async function getAllDevice(req, res) {
  const { search, page = 1, limit = 10 } = req.params;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 10);
  const offset = (pageNum - 1) * limitNum;

  const client = await pool.connect();
  try {
    let whereConditions = ["deleted_at IS NULL"];
    let params = [];

    // Condición en caso de que search no este vacio
    if (search) {
      await client.query("BEGIN");

      params.push(`%${search}%`, `%${search}%`);
      whereConditions.push(
        `client_name ILIKE $${params.length - 1} OR device ILIKE $${params.length}`,
      );
    }
    //Unir todas los condiciones
    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;
    //Unir todas query para hacer la query
    const devicesQuery = `
      SELECT *
      FROM device
      ${whereClause}
      ORDER BY id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;
    //Clausula para obtener la cantidad de columnas para la paginación
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM device
      ${whereClause};
    `;
    //Dispara los consultas para las devicesQuery y countQuery
    const [devicesResult, countResult] = await Promise.all([
      pool.query(devicesQuery, [...params, limitNum, offset]),
      pool.query(countQuery, params),
    ]);

    await client.query("COMMIT");
    //Total de devices y total de paginas
    const totalItems = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalItems / limitNum);

    return handleSuccess(req, res, {
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages,
      products: devicesResult.rows,
    });
  } catch (err) {
    console.error(err);
    handleError(req, res, "Error al leer las entradas");
  } finally {
    client.release();
  }
}
