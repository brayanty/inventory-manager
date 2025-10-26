import Fuse from "fuse.js";
import { FILES } from "../../config/file.js";
import { readData } from "../../utils/file.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";

export default async function getAllDevice(req, res) {
  const { search, page = 1, limit = 10 } = req.query;

  try {
    const devices = await readData(FILES.DEVICES);

    let filtered = devices;
    // Filtrar si hay búsqueda
    if (search) {
      const fuse = new Fuse(devices, {
        keys: ["device", "client"],
        includeScore: true,
        threshold: 0.3,
      });
      filtered = fuse.search(search).map((r) => r.item);
    }

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
      devices: paginated,
    });
  } catch {
    handleError(req, res, "Error al leer las entradas");
  }
}
