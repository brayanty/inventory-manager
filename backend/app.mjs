import "dotenv/config";
import express, { json } from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import devicesRouters from "./routers/device.route.js";
import productsRouters from "./routers/product.route.js";
import categoryRouters from "./routers/category.route.js";

import { handleError } from "./modules/handleResponse.js";

// Variables de entorno
const PORT = process.env.PORT || process.env.production || 3000;
const IP_LOCAL = process.env.IP_LOCALHOST;

const app = express();

// Middlewares
app.use(json());
app.use(morgan("short"));
app.use(
  cors({
    origin: ["https://localhost:3000", "https://127.0.0.1:3000"],
    credentials: true,
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
app.use("/api", categoryRouters);

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

// app.listen(0, (host) => {
//   console.log(`API de servicio técnico corriendo en http://localhost:${PORT}`);
// });

app.listen(PORT, IP_LOCAL, null, () => {
  console.log(`API de servicio técnico corriendo en http://localhost:${PORT}`);
  console.log(
    `API de servicio técnico corriendo en http://${IP_LOCAL}:${PORT}`
  );
});
