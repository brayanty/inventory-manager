import pool from "../../config/db.js";
import * as productRepo from "../../repositories/product.repository.js";
import { handleSuccess, handleError } from "../../modules/handleResponse.js";
import { postProductsPrinter } from "../../services/printerService.js";

export async function soldProduct(req, res) {
  const productSale = req.body;
  if (!Array.isArray(productSale) || productSale.length === 0) {
    return handleError(req, res, "Se requiere un arreglo de productos", 400);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Validar los datos recibidos
    const { rows: dbProducts } = await productRepo.getValidProducts(client, productSale);

    if (dbProducts.length !== productSale.length) {
      throw new Error("NOT_FOUND");
    }
    // Actualizar el stock
    const updatedStock = await productRepo.decrementStock(client, productSale);
    if (updatedStock.length !== productSale.length) {
      throw new Error("INSUFFICIENT_STOCK");
    }
    // Preparar datos para registro de venta
    const productsSave = productSale.map((item) => {

      if (item.quantity <= 0) {
        throw new Error("INVALID_QUANTITY")
      }
      const updated = updatedStock.find((p) => p.id === item.id);
      if (!updated) {
        return
      }
      return {
        id: updated.id,
        price: updated.price,
        category: updated.category,
        quantity: item.quantity,
      };
    });
    
    // Registrar venta
    await productRepo.registerSale(client, productsSave);

    await client.query("COMMIT");

    // Enviar los datos de imprecion
    const printerData = productsSave.map((p) => ({
      ...p,
      stock: productSale.find((s) => s.id === p.id).quantity,
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
    if (err.message === "INVALID_QUANTITY") {
      return handleError(req, res, "Cantidad inválida", 400);
    }
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
