import { handleSuccess, handleError } from "../../modules/handleResponse.js";
import pool from "../../config/db.js";
import { postProductsPrinter } from "../../services/printerService.js";

export async function soldProduct(req, res) {
  const productSale = req.body;
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
      if (dbP.stock < item.stock) throw new Error("INSUFFICIENT_STOCK");
    }

    // Actualizar el stock
    await client.query(
      `UPDATE product p
       SET stock = p.stock - x.stock
       FROM jsonb_to_recordset($1::jsonb) AS x(id INT, stock INT)
       WHERE p.id = x.id`,
      [JSON.stringify(productSale)],
    );
    // Registrar venta
    const saleRecords = productSale.map((item) => {
      const dbP = dbProducts.find((p) => p.id === item.id);
      return {
        stock: item.stock,
        price: dbP.price,
        category: dbP.category,
        product_id: item.id,
      };
    });

    await client.query(
      `INSERT INTO soldProduct (client_name, sales, price,category, product_id,sold_at)
       SELECT client_name, stock, price, category, product_id, NOW()
       FROM jsonb_to_recordset($1::jsonb) AS t(client_name varchar(250), stock int, price numeric(10,2), category varchar(100), product_id int)`,
      [JSON.stringify(saleRecords)],
    );

    await client.query("COMMIT");

    // Enviar los datos de imprecion
    const printerData = dbProducts.map((p) => ({
      ...p,
      stock: productSale.find((s) => s.id === p.id).stock,
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
