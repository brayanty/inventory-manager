import { handleSuccess, handleError } from "../../modules/handleResponse.js";
import pool from "../../config/db.js";
import { postProductsPrinter } from "../../services/printerService.js";

export async function soldProduct(req, res) {
  const { nameClient, productSale } = req.body[0];

  if (!Array.isArray(productSale) || productSale.length === 0) {
    return handleError(req, res, "Se requiere un arreglo de productos", 400);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Bloquear filas y obtener datos frescos en un solo paso
    const soldIds = productSale.map((p) => p.id);
    const { rows: dbProducts } = await client.query(
      `SELECT id, name, stock, price, category FROM product 
       WHERE id = ANY($1::int[]) FOR UPDATE`,
      [soldIds],
    );

    // Validar los datos recibidos
    if (dbProducts.length !== soldIds.length) {
      throw new Error("NOT_FOUND");
    }

    for (const item of productSale) {
      const dbP = dbProducts.find((p) => p.id === item.id);
      if (dbP.stock < item.sales) throw new Error("INSUFFICIENT_STOCK");
    }

    // Actualizar el stock
    await client.query(
      `UPDATE product p
       SET stock = p.stock - x.sales
       FROM jsonb_to_recordset($1::jsonb) AS x(id INT, sales INT)
       WHERE p.id = x.id`,
      [JSON.stringify(productSale)],
    );

    // Registrar venta
    const saleRecords = productSale.map((item) => {
      const dbP = dbProducts.find((p) => p.id === item.id);
      return { productID: item.id, sales: item.sales, price: dbP.price };
    });

    await client.query(
      `INSERT INTO soldProduct (sales, price, productID)
       SELECT sales, price, productID
       FROM jsonb_to_recordset($1::jsonb) AS t(sales int, price numeric, productID int)`,
      [JSON.stringify(saleRecords)],
    );

    await client.query("COMMIT");

    // Enviar los datos de imprecion
    const printerData = dbProducts.map((p) => ({
      ...p,
      sales: productSale.find((s) => s.id === p.id).sales,
    }));

    const printerSuccess = await postProductsPrinter(printerData);

    handleSuccess(
      req,
      res,
      { printer: printerSuccess, data: printerData },
      201,
    );
  } catch (err) {
    await client.query("ROLLBACK");

    if (err.message === "NOT_FOUND") {
      return handleError(req, res, "Uno o más productos no existen", 404);
    }
    if (err.message === "INSUFFICIENT_STOCK") {
      return handleError(
        req,
        res,
        "Stock insuficiente para la transacción",
        400,
      );
    }

    console.error("Error en la venta:", err);
    handleError(req, res, "Error interno al procesar la venta", 500);
  } finally {
    client.release();
  }
}
