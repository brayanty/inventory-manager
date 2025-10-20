import { FILES } from "../../config/file.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import { overwriteData, readData } from "../../utils/file.js";

export async function deleteProduct(req, res) {
  const productID = req.params.id;

  try {
    const products = await readData(FILES.PRODUCTS);
    const newProducts = products.filter((p) => p.id !== productID);
    await overwriteData(newProducts, FILES.PRODUCTS);
    handleSuccess(req, res, productID);
  } catch {
    handleError(req, res, "Error al eliminar el producto");
  }
}
