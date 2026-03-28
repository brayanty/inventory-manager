import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import pool from "../../config/db.js";

// Controlador para obtener las ventas mensuales
// LAS SENTENCIAS SQL DEBERIAN IR EN REPOSITORIO PERO NO TIENE SENTIDO POR QUE NO SE USAR EN OTRO SITIO, ADEMAS DE QUE ES UNA CONSULTA MUY ESPECIFICA PARA ESTE CONTROLADOR
export async function getDailySales(req, res) {
  try {
    // Obtener fecha actual (sin hora)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDate = today.toISOString().split("T")[0];

    const query = `
      SELECT 
        COUNT(*) as total_items_sold,
        COUNT(DISTINCT product_id) as unique_products_sold,
        SUM(sales) as total_quantity,
        SUM(price * sales) as total_revenue,
        COUNT(DISTINCT client_name) as unique_customers,
        ARRAY_AGG(DISTINCT category) as categories
      FROM soldProduct
      WHERE DATE(sold_at) = $1::date
    `;

    const result = await pool.query(query, [todayDate]);
    const salesData = result.rows[0];

    // Obtener detalles de productos vendidos hoy
    const detailsQuery = `
      SELECT 
        p.id,
        p.name as product_name,
        p.category,
        SUM(s.sales) as total_quantity,
        p.price,
        SUM(s.price * s.sales) as subtotal,
        COUNT(*) as times_sold
      FROM soldProduct s
      JOIN product p ON p.id = s.product_id
      WHERE DATE(s.sold_at) = $1::date
      GROUP BY p.id, p.name, p.category, p.price
      ORDER BY total_quantity DESC
    `;

    const detailsResult = await pool.query(detailsQuery, [todayDate]);

    const response = {
      date: todayDate,
      summary: {
        total_items_sold: parseInt(salesData.total_items_sold) || 0,
        unique_products_sold: parseInt(salesData.unique_products_sold) || 0,
        total_quantity: parseInt(salesData.total_quantity) || 0,
        total_revenue: parseFloat(salesData.total_revenue) || 0,
        unique_customers: parseInt(salesData.unique_customers) || 0,
        categories: salesData.categories || [],
      },
      products: detailsResult.rows.map((item) => ({
        product_id: item.id,
        product_name: item.product_name,
        category: item.category,
        price: parseFloat(item.price),
        total_quantity: parseInt(item.total_quantity),
        subtotal: parseFloat(item.subtotal),
        times_sold: parseInt(item.times_sold),
      })),
    };

    return handleSuccess(req, res, response, 200);
  } catch (error) {
    console.error("Error en getDailySales:", error);
    return handleError(
      req,
      res,
      `Error al obtener ventas del día: ${error.message}`,
      500,
    );
  }
}
