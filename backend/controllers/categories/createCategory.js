import { FILES } from "../../config/file.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import { overwriteData } from "../../utils/file.js";

export default async function createCategory(req, res) {
  const { category } = req.body;
  const categories = await readData(FILES.CATEGORIES);

  category = category.trim().toLowerCase();

  const existCategory = categories.find(
    (cat) => cat.category.toLowerCase() === category
  );

  if (existCategory) {
    return handleError(
      req,
      res,
      `La categoría "${category}" ya está en la lista`
    );
  }

  const newCategory = {
    id: uuidv4(),
    category,
  };

  try {
    categories.push(newCategory);
    await overwriteData(newCategory, FILES.CATEGORIES);
    handleSuccess(req, res, newCategory);
  } catch {
    handleError(req, res, "Error al guardar la categoría");
  }
}
