import { FILES } from "../../config/file.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import { overwriteData, readData } from "../../utils/file.js";

export async function updateProduct(req, res) {
  const { name, price } = req.body;
  const total = Number(req.body.total);

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
  if (total == null || typeof total !== "number" || isNaN(total) || total < 0)
    return handleError(
      req,
      res,
      "El campo 'total' debe ser un número válido y no negativo",
      400
    );

  try {
    const products = await readData(FILES.PRODUCTS);
    const index = products.findIndex((p) => p.id === req.params.id);
    if (index === -1)
      return handleError(req, res, "Producto no encontrado", 400);

    const updated = { ...products[index], name: name.trim(), price, total };
    products[index] = updated;
    await overwriteData(products, FILES.PRODUCTS);
    handleSuccess(req, res, updated, 201);
  } catch {
    handleError(req, res, "Error al actualizar el producto");
  }
}
