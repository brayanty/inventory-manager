import Fuse from "fuse.js";
import { FILES } from "../../config/file.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import { readData } from "../../utils/file.js";

export default async function getRepairs(req, res) {
  const search = req.query.search;
  try {
    if (!search) {
      return handleError(req, res, "El parámetro de búsqueda está vacío", 404);
    }

    const repairTypeAvailable = await readData(FILES.PRODUCTS);

    const filterRepairType = repairTypeAvailable.filter((repair) => {
      return repair.category == "repuesto" || repair.category == "display";
    });
    const fuse = new Fuse(filterRepairType, {
      keys: ["name"],
      includeScore: true,
      threshold: 0.3,
    });

    const results = fuse.search(search);

    if (!results.length) {
      return handleError(
        req,
        res,
        "No se encontraron resultados para la búsqueda",
        404
      );
    }
    handleSuccess(
      req,
      res,
      results.map((r) => r.item)
    );
  } catch (error) {
    console.error("Error al leer las reparaciones disponibles:", error);
    handleError(req, res, "Error al leer las reparaciones disponibles", 500);
  }
}
