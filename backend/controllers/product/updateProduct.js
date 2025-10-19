import { FILES } from "../../config/file.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import { readData, writeData } from "../../utils/file.js";

export async function updateProduct(req, res) {
  const { name, price, stock } = req.body;

  if (!name || typeof name !== "string" || name.trim() === "")
    return handleError(
      req,
      res,
      "El campo 'name' debe ser una cadena no vacía",
      400
    );
  if (price == null || typeof price !== "number" || isNaN(price) || price < 0)
    return handleError(
      req,
      res,
      "El campo 'price' debe ser un número válido y no negativo",
      400
    );
  if (stock == null || typeof stock !== "number" || isNaN(stock) || stock < 0)
    return handleError(
      req,
      res,
      "El campo 'stock' debe ser un número válido y no negativo",
      400
    );

  try {
    const products = await readData(FILES.PRODUCTS);
    const index = products.findIndex((p) => p.id === req.params.id);
    if (index === -1)
      return handleError(req, res, "Producto no encontrado", 400);

    const updated = { ...products[index], name: name.trim(), price, stock };
    products[index] = updated;
    await writeData(products, FILES.PRODUCTS);
    handleSuccess(req, res, updated, 201);
  } catch {
    handleError(req, res, "Error al actualizar el producto");
  }
}
