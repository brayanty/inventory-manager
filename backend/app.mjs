import "dotenv/config";
import express, { json } from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import devicesRouters from "./routers/device.route.js";
import productsRouters from "./routers/product.route.js";

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
app.use("/api", productsRouters);

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
