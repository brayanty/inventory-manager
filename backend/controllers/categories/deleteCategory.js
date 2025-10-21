import { FILES } from "../../config/file.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import { overwriteData, readData } from "../../utils/file.js";

export default async function deleteCategory(req, res) {
  const newCategoryID = req.params.id;
  try {
    const categories = await readData(FILES.CATEGORIES);

    const categoryExits = categories.findIndex((cat) => {
      return cat.id === newCategoryID;
    });
    if (categoryExits === -1) {
      return handleError(
        req,
        res,
        `La categoria ${newCategoryID} no existe`,
        406
      );
    }

    const newCategories = categories.filter((c) => {
      return c.id !== newCategoryID;
    });

    await overwriteData(newCategories, FILES.CATEGORIES);

    handleSuccess(req, res, newCategoryID, "Categoría eliminada", 200);
  } catch {
    handleError(req, res, "Error al eliminar la categoría", 500);
  }
}
