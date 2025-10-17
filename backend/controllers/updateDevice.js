import { FILES } from "../config/file.js";
import { handleError, handleSuccess } from "../modules/handleResponse.js";
import { overwriteData, readData } from "../utils/file.js";

export default async function updateDevice(req, res) {
  const { id } = req.params;
  const updateFields = req.body;

  try {
    const products = await readData(FILES.DEVICES);

    const index = products.findIndex((e) => e.id === id);
    if (index === -1) {
      return handleError(req, res, "Dispositivo no encontrado", 404);
    }
    const updatedProduct = { ...products[index], ...updateFields };

    const newProducts = [...products];
    newProducts[index] = updatedProduct;

    await overwriteData(newProducts, DEVICES_FILE);

    handleSuccess(req, res, updateDevice);
  } catch {
    handleError(req, res, "Error al actualizar el dispositivo");
  }
}
