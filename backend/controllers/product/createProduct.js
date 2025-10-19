import { handleError, handleSuccess } from "../../modules/handleResponse.js";

export async function createProduct(req, res) {
  const { name, category } = req.body;

  const price = parseFloat(req.body.price);
  const total = parseFloat(req.body.total);

  const categoriesList = await readData(CATEGORIES_FILE);
  const categoryExists = categoriesList.find(
    (cat) => cat.category === category
  );
  if (!categoryExists) {
    return handleError(req, res, "La categoría proporcionada no existe", 400);
  }

  if (isNaN(price) || price < 0) {
    return handleError(
      req,
      res,
      "El precio debe ser un número válido y no negativo"
    );
  }
  if (!name || typeof name !== "string" || name.trim() === "")
    return handleError(
      req,
      res,
      "El campo 'name' debe ser una cadena no vacía",
      400
    );
  if (total == null || typeof total !== "number" || isNaN(total) || total < 0)
    return handleError(
      req,
      res,
      "El campo 'total' debe ser un número válido y no negativo"
    );

  const newProduct = {
    id: uuidv4(),
    sales: 0,
    name: name,
    category: categoryExists.category,
    total: total,
    price: price,
  };

  try {
    writeData(newProduct, PRODUCTS_FILE);
    handleSuccess(req, res, newProduct);
  } catch {
    handleError(req, res, "Hubo un error interno");
  }
}
