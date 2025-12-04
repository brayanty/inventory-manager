import Fuse from "fuse.js";
import { FILES } from "../../config/file.js";
import { readData } from "../../utils/file.js";
import { searchCoincide } from "../../utils/searchCoincide.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";

// Obtener productos con paginación y búsqueda
export async function getSoldProduct(req, res) {
  const { page = 1, limit = 10, date } = req.query;

  const search = new Date(date).toISOString().split("T")[0];
  console.log("Search Date:", search);

  try {
    const soldProduct = await readData(FILES.SALES);

    const filtered = searchCoincide(soldProduct, search, ["date"]);
    // Calcular paginado
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limitNum);
    const start = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(start, start + limitNum);

    handleSuccess(req, res, {
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages,
      soldProduct: paginated,
    });
  } catch (error) {
    console.error(error);
    handleError(req, res, "Error al leer los productos");
  }
}
