import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import pool from "../../config/db.js";

// Controlador para obtener las ventas mensuales
// LAS SENTENCIAS SQL DEBERIAN IR EN REPOSITORIO PERO NO TIENE SENTIDO POR QUE NO SE USAR EN OTRO SITIO, ADEMAS DE QUE ES UNA CONSULTA MUY ESPECIFICA PARA ESTE CONTROLADOR
export async function getMonthlySales(req, res) {
  try {
    // Obtener fecha actual y calcular el primer día del mes
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;

    const query = `
      SELECT 
        COUNT(*) as total_items_sold,
        COUNT(DISTINCT product_id) as unique_products_sold,
        SUM(sales) as total_quantity,
        SUM(price * sales) as total_revenue,
        COUNT(DISTINCT client_name) as unique_customers,
        ARRAY_AGG(DISTINCT category) as categories,
        MIN(sold_at) as first_sale,
        MAX(sold_at) as last_sale
      FROM soldProduct
      WHERE DATE_TRUNC('month', sold_at) = DATE_TRUNC('month', $1::date)
    `;

    const result = await pool.query(query, [monthStart]);
    const salesData = result.rows[0];

    // Obtener detalles por producto
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
      WHERE DATE_TRUNC('month', s.sold_at) = DATE_TRUNC('month', $1::date)
      GROUP BY p.id, p.name, p.category, p.price
      ORDER BY subtotal DESC
    `;

    const detailsResult = await pool.query(detailsQuery, [monthStart]);

    // Obtener detalles por día
    const dailyQuery = `
      SELECT 
        DATE(sold_at) as date,
        COUNT(*) as total_items_sold,
        SUM(sales) as total_quantity,
        SUM(price * sales) as total_revenue,
        COUNT(DISTINCT product_id) as unique_products,
        COUNT(DISTINCT client_name) as unique_customers
      FROM soldProduct
      WHERE DATE_TRUNC('month', sold_at) = DATE_TRUNC('month', $1::date)
      GROUP BY DATE(sold_at)
      ORDER BY date DESC
    `;

    const dailyResult = await pool.query(dailyQuery, [monthStart]);

    const response = {
      month: `${currentYear}-${String(currentMonth).padStart(2, "0")}`,
      summary: {
        total_items_sold: parseInt(salesData.total_items_sold) || 0,
        unique_products_sold: parseInt(salesData.unique_products_sold) || 0,
        total_quantity: parseInt(salesData.total_quantity) || 0,
        total_revenue: parseFloat(salesData.total_revenue) || 0,
        unique_customers: parseInt(salesData.unique_customers) || 0,
        categories: salesData.categories || [],
        first_sale: salesData.first_sale
          ? new Date(salesData.first_sale).toISOString()
          : null,
        last_sale: salesData.last_sale
          ? new Date(salesData.last_sale).toISOString()
          : null,
      },
      top_products: detailsResult.rows.map((item) => ({
        product_id: item.id,
        product_name: item.product_name,
        category: item.category,
        price: parseFloat(item.price),
        total_quantity: parseInt(item.total_quantity),
        subtotal: parseFloat(item.subtotal),
        times_sold: parseInt(item.times_sold),
      })),
      daily_breakdown: dailyResult.rows.map((item) => ({
        date: item.date.toISOString().split("T")[0],
        total_items_sold: parseInt(item.total_items_sold),
        total_quantity: parseInt(item.total_quantity),
        total_revenue: parseFloat(item.total_revenue),
        unique_products: parseInt(item.unique_products),
        unique_customers: parseInt(item.unique_customers),
      })),
    };

    return handleSuccess(req, res, response, 200);
  } catch (error) {
    console.error("Error en getMonthlySales:", error);
    return handleError(
      req,
      res,
      `Error al obtener ventas del mes: ${error.message}`,
      500,
    );
  }
}
