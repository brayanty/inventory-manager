import "dotenv/config";
import express, { json } from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import devicesRouters from "./routers/device.route.js";
import { handleError } from "./modules/handleResponse.js";

// Variables de entorno
const PORT = process.env.PORT || 3000;

const app = express();

// Middlewares
app.use(json());
app.use(morgan("short"));
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Demasiadas solicitudes, intenta de nuevo más tarde" },
});
app.use(limiter);

app.use("/api", devicesRouters);

// // DELETE
// app.delete("/devices/:id", async (req, res) => {
//   try {
//     const entries = await readData(DEVICES_FILE);
//     const newEntries = entries.filter((e) => e.id !== req.params.id);
//     await overwriteData(newEntries, DEVICES_FILE);
//     res.json({ result: "Entrada eliminada" });
//   } catch {
//     sendError(res, 500, "Error al eliminar la entrada");
//   }
// });

// // Tipos de reparaciones disponibles
// app.get("/repairTypeAvailable", async (req, res) => {
//   const search = req.query.search; // Usar req.query para obtener parámetros de consulta
//   try {
//     if (!search) {
//       return res
//         .status(400)
//         .json({ message: "El parámetro de búsqueda está vacío" });
//     }

//     const repairTypeAvailable = await readData(PRODUCTS_FILE);

//     const filterRepairType = repairTypeAvailable.filter((repair) => {
//       return repair.category == "repuesto" || repair.category == "display";
//     });
//     const fuse = new Fuse(filterRepairType, {
//       keys: ["name"], // Ajustar las claves según los campos correctos
//       includeScore: true,
//       threshold: 0.3, // Umbral para búsqueda difusa
//     });

//     const results = fuse.search(search);

//     if (!results.length) {
//       return res
//         .status(404)
//         .json({ message: "No se encontraron resultados para la búsqueda" });
//     }

//     res.json(results.map((r) => r.item));
//   } catch (error) {
//     console.error("Error al leer las reparaciones disponibles:", error);
//     res
//       .status(500)
//       .json({ message: "Error al leer las reparaciones disponibles" });
//   }
// });

// app.post("/devices/repairTypeAvailable", async (req, res) => {
//   const { type } = req.body;
//   const types = await readData(DEVICES_REPAIR_AVAILABLE_FILE);

//   const typeExists = types.find(
//     (t) => t.type.toLowerCase() === type.trim().toLowerCase()
//   );

//   if (typeExists) {
//     return res
//       .status(400)
//       .json({ error: `El tipo de reparación "${type}" ya existe` });
//   }

//   if (!type || typeof type !== "string" || type.trim() === "")
//     return sendError(res, 400, "El campo 'type' debe ser una cadena no vacía");

//   const newType = {
//     id: uuidv4(),
//     type: type.trim(),
//   };

//   types.push(newType);

//   try {
//     await overwriteData(newType, DEVICES_REPAIR_AVAILABLE_FILE);
//     res.status(201).json(newType);
//   } catch {
//     sendError(res, 500, "Error al guardar el tipo de reparación");
//   }
// });

// // PRODUCTS

// // Obtener productos con paginación y búsqueda
// app.get("/products", async (req, res) => {
//   try {
//     const entries = await readData(PRODUCTS_FILE);
//     const { search, page = 1, limit = 10 } = req.query;

//     let filtered = entries;

//     // Filtrar si hay búsqueda
//     if (search) {
//       const fuse = new Fuse(entries, {
//         keys: ["name"],
//         includeScore: true,
//         threshold: 0.3,
//       });
//       filtered = fuse.search(search).map((r) => r.item);
//     }

//     // Calcular paginado
//     const pageNum = parseInt(page) || 1;
//     const limitNum = parseInt(limit) || 10;
//     const totalItems = filtered.length;
//     const totalPages = Math.ceil(totalItems / limitNum);
//     const start = (pageNum - 1) * limitNum;
//     const paginated = filtered.slice(start, start + limitNum);

//     res.json({
//       page: pageNum,
//       limit: limitNum,
//       totalItems,
//       totalPages,
//       data: paginated,
//     });
//   } catch (error) {
//     sendError(res, 500, "Error al leer los productos");
//   }
// });

// // Crear un nuevo producto
// app.post("/products", async (req, res) => {
//   const { name, category } = req.body;
//   const price = parseFloat(req.body.price);
//   const total = parseFloat(req.body.total);
//   const categoriesList = await readData(CATEGORIES_FILE);
//   const categoryExists = categoriesList.find(
//     (cat) => cat.category === category
//   );
//   if (!categoryExists) {
//     return res
//       .status(400)
//       .json({ error: "La categoría proporcionada no existe" });
//   }

//   if (isNaN(price) || price < 0) {
//     return res
//       .status(400)
//       .json({ error: "El precio debe ser un número válido y no negativo" });
//   }
//   if (!name || typeof name !== "string" || name.trim() === "")
//     return sendError(res, 400, "El campo 'name' debe ser una cadena no vacía");
//   if (total == null || typeof total !== "number" || isNaN(total) || total < 0)
//     return sendError(
//       res,
//       400,
//       "El campo 'total' debe ser un número válido y no negativo"
//     );

//   const newProduct = {
//     id: uuidv4(),
//     sales: 0,
//     name: name,
//     category: categoryExists.category,
//     total: total,
//     price: price,
//   };

//   try {
//     writeData(newProduct, PRODUCTS_FILE);
//     res.json(newProduct, 201);
//   } catch {
//     sendError(res, 404);
//   }
// });

// // Actualizar producto
// app.put("/products/:id", async (req, res) => {
//   const { name, price, stock } = req.body;

//   if (!name || typeof name !== "string" || name.trim() === "")
//     return sendError(res, 400, "El campo 'name' debe ser una cadena no vacía");
//   if (price == null || typeof price !== "number" || isNaN(price) || price < 0)
//     return sendError(
//       res,
//       400,
//       "El campo 'price' debe ser un número válido y no negativo"
//     );
//   if (stock == null || typeof stock !== "number" || isNaN(stock) || stock < 0)
//     return sendError(
//       res,
//       400,
//       "El campo 'stock' debe ser un número válido y no negativo"
//     );

//   try {
//     const products = await readData(PRODUCTS_FILE);
//     const index = products.findIndex((p) => p.id === req.params.id);
//     if (index === -1) return sendError(res, 404, "Producto no encontrado");

//     const updated = { ...products[index], name: name.trim(), price, stock };
//     products[index] = updated;
//     await writeData(products, PRODUCTS_FILE);
//     res.json(updated);
//   } catch {
//     sendError(res, 500, "Error al actualizar el producto");
//   }
// });
// app.post("/products/sold", async (req, res) => {
//   try {
//     const soldProducts = req.body;

//     // Validar entrada
//     if (!Array.isArray(soldProducts) || soldProducts.length === 0) {
//       return res.status(400).json({
//         message: "Se requiere un arreglo no vacío de productos vendidos",
//       });
//     }

//     // Validar cada producto
//     for (const item of soldProducts) {
//       if (!item.id || typeof item.id !== "string" || item.id.trim() === "") {
//         return res.status(400).json({
//           message: `ID inválido para el producto: ${JSON.stringify(item)}`,
//         });
//       }
//       if (!Number.isInteger(item.amount) || item.amount <= 0) {
//         return res.status(400).json({
//           message: `Cantidad inválida para el producto con ID ${item.id}`,
//         });
//       }
//     }

//     // Leer datos de productos
//     const productsData = await readData(PRODUCTS_FILE);

//     // Verificar si todos los IDs de productos existen
//     const invalidProduct = soldProducts.find(
//       (item) => !productsData.some((product) => product.id === item.id)
//     );
//     if (invalidProduct) {
//       return res.status(404).json({
//         message: `Producto con ID ${invalidProduct.id} no encontrado`,
//       });
//     }

//     // Verificar inventario y preparar actualizaciones
//     const updatedProducts = productsData.map((product) => {
//       const soldItem = soldProducts.find((item) => item.id === product.id);
//       if (soldItem) {
//         if (product.total < soldItem.amount) {
//           return res.status(400).json({
//             message: `No hay suficiente stock para el producto ${product.name} (disponible: ${product.total}, solicitado: ${soldItem.amount})`,
//           });
//         }
//         return {
//           ...product,
//           total: product.total - soldItem.amount,
//           sales: product.sales + soldItem.amount,
//         };
//       }
//       return product;
//     });

//     // Verificar si ya se envió una respuesta (por ejemplo, por falta de stock)
//     if (res.headersSent) {
//       return; // Evitar procesamiento adicional si se envió una respuesta
//     }

//     // Preparar datos para postProductsPrinter
//     const printableProducts = soldProducts.map((item) => {
//       const product = productsData.find((p) => p.id === item.id);
//       return {
//         name: product.name,
//         price: product.price,
//         amount: item.amount,
//       };
//     });
//     const sale = {
//       id: uuidv4(),
//       timestamp: new Date().toISOString(),
//       products: soldProducts,
//     };
//     // Agregar o guardar en un archivo de ventas
//     await writeData(sale, SALES_FILE);

//     // Guardar productos actualizados
//     await overwriteData(updatedProducts, PRODUCTS_FILE);

//     try {
//       // Enviar a la impresor
//       await postProductsPrinter(printableProducts);
//     } catch (err) {
//       console.error("Error al imprimir los productos:", err);
//       // No fallamos la solicitud, solo registramos el error
//     }

//     res.status(201).json(updatedProducts);
//   } catch (err) {
//     sendError(res, 500, "Error al procesar la venta");
//   }
// });

// // Crear una nueva categoria
// app.get("/products/categories", async (req, res) => {
//   try {
//     const categories = await readData(CATEGORIES_FILE);
//     res.json(categories);
//   } catch {
//     sendError(res, 500, "Oops hubo un error en el servidor");
//   }
// });

// app.post("/products/categories", async (req, res) => {
//   let { category } = req.body;
//   const categories = await readData(CATEGORIES_FILE);

//   // Normalizamos a minúsculas y recortamos espacios
//   category = category.trim().toLowerCase();

//   // Verificar si ya existe la categoría (en minúsculas)
//   const existCategory = categories.find(
//     (cat) => cat.category.toLowerCase() === category
//   );
//   if (existCategory) {
//     return res.json({
//       message: `La categoría "${category}" ya está en la lista`,
//     });
//   }

//   // Crear nueva categoría
//   const newCategory = {
//     id: uuidv4(),
//     category, // ya está en minúsculas
//   };

//   try {
//     categories.push(newCategory); // agregamos al array
//     await writeData(newCategory, CATEGORIES_FILE); // guardamos array completo
//     res.status(201).json(newCategory);
//   } catch (err) {
//     sendError(res, 500, "Error al guardar la categoría");
//   }
// });

// app.delete("/products/categories/:id", async (req, res) => {
//   try {
//     const categories = await readData(CATEGORIES_FILE);
//     const newCategories = categories.filter((c) => c.id !== req.params.id);
//     await writeData(newCategories, CATEGORIES_FILE);
//     res.json({ result: "Categoría eliminada" });
//   } catch {
//     sendError(res, 500, "Error al eliminar la categoría");
//   }
// });

// app.delete("/products/:id", async (req, res) => {
//   try {
//     const products = await readData(PRODUCTS_FILE);
//     const newProducts = products.filter((p) => p.id !== req.params.id);
//     await overwriteData(newProducts, PRODUCTS_FILE);
//     res.json({ result: "Producto eliminado" });
//   } catch (err) {
//     sendError(res, 500, "Error al eliminar el producto");
//   }
// });

// ... tus middlewares y rutas existentes ...

// Manejo de rutas no encontradas
app.use((req, res) => {
  handleError(req, res, `Ruta no encontrada: ${req.method} ${req.url}`, 404);
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error("Error global:", error);
  handleError(req, res, "Error interno del servidor", 500);
});

// Iniciar servidor// ... tus middlewares y rutas existentes ...

// Manejo de rutas no encontradas
app.use((req, res) => {
  handleError(req, res, `Ruta no encontrada: ${req.method} ${req.url}`, 404);
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error("Error global:", error);
  handleError(req, res, "Error interno del servidor", 500);
});

app.listen(PORT, () => {
  console.log(`API de servicio técnico corriendo en http://localhost:${PORT}`);
});
