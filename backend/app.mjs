import express, { json } from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import devicesRouters from "./routers/device.route.js";
import productsRouters from "./routers/product.route.js";
import categoryRouters from "./routers/category.route.js";
import userRouters from "./routers/user.route.js";
import fs from "fs/promises";
import { handleError } from "./modules/handleResponse.js";
import SSL_CONFIG from "./config/ssl.js";
import path from "path";
import logger from "./config/logger.js";
import loadConfig from "./config/env.js";

// Variables de entorno
const {BACKEND_PORT,FRONTEND_PORT,IP_LOCALHOST,VITE_API_URL} = loadConfig();
const options = {
    key: await fs.readFile(SSL_CONFIG.keyPath),
    cert: await fs.readFile(SSL_CONFIG.certPath),
};

const app = express();

const corsOptions = {
  origin: `${VITE_API_URL}:${FRONTEND_PORT}`,
  optionsSuccessStatus: 200 
};
// Middlewares
app.use(json());
app.use(morgan("dev"));
app.use(cors(corsOptions));
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: "Demasiadas solicitudes, intenta de nuevo más tarde" },
});
app.use(limiter);
app.use(express.static(path.join(process.cwd(), "public")));

app.use("/api", devicesRouters);
app.use("/api", productsRouters);
app.use("/api", categoryRouters);
app.use("/api", userRouters);

// Manejo de rutas no encontradas
app.use((req, res) => {
    handleError(req, res, `Ruta no encontrada: ${req.method} ${req.url}`, 404);
});

// Manejo de errores global
app.use((error, req, res, next) => {
    logger.error(toString(error.message),"Error global:");
    handleError(req, res, "Error interno del servidor", 500);
});

// Manejo de rutas no encontradas
app.use((req, res) => {
    handleError(req, res, `Ruta no encontrada: ${req.method} ${req.url}`, 404);
});

app.listen(BACKEND_PORT, () => {
    logger.info(`API de servicio técnico corriendo en http://${IP_LOCALHOST}:${BACKEND_PORT}`);

});

// app.listen(BACKEND_PORT, IP_LOCAL, null, () => {
//   console.log(`API de servicio técnico corriendo en http://localhost:${BACKEND_PORT}`);
//   console.log(
//     `API de servicio técnico corriendo en http://${IP_LOCAL}:${BACKEND_PORT}`,
//   );
// });

// https.createServer(options, app).listen(BACKEND_PORT, () => {
//   console.log(`Servidor HTTPS corriendo en el puerto ${BACKEND_PORT}`);
// });
