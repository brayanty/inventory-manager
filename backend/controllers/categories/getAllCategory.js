import { FILES } from "../../config/file.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import { readData } from "../../utils/file.js";

export default async function getAllCategory(req, res) {
  try {
    const categories = await readData(FILES.CATEGORIES);
    handleSuccess(req, res, categories);
  } catch {
    handleError(req, res, "No se pudo obtener las categorias");
  }
}
