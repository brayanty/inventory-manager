const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const Fuse = require("fuse.js");

const app = express();
const port = 3000;

// Archivos JSON usados
const DEVICES_FILE = "data.json";
const PRODUCTS_FILE = "products.json";

// Middlewares
app.use(express.json());
app.use(morgan("short"));
app.use(
  cors({
    origin: "http://localhost:5173", // Allow only this origin
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Demasiadas solicitudes, intenta de nuevo más tarde" },
});
app.use(limiter);

// Función para errores
const sendError = (res, status, message) =>
  res.status(status).json({ error: message });

// Funciones de archivo
async function readData(nameFile) {
  const filePath = path.join(__dirname, nameFile);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeData(newData, nameFile) {
  try {
    await fs.writeFile(
      path.join(__dirname, nameFile),
      JSON.stringify(newData, null, 2)
    );
    console.log("Datos escritos correctamente");
  } catch (err) {
    console.error("Error al escribir datos:", err);
    throw err;
  }
}

// Validaciones
function validateEntryData({ client, device, IMEI, status, entryDate, price }) {
  if (!client || typeof client !== "string" || client.trim() === "")
    return "El campo 'client' debe ser una cadena no vacía";
  if (!device || typeof device !== "string" || device.trim() === "")
    return "El campo 'device' debe ser una cadena no vacía";
  if (!IMEI || IMEI.toString().trim().length !== 15)
    return "El IMEI debe tener 15 caracteres";
  if (!status || typeof status !== "string" || status.trim() === "")
    return "El campo 'status' debe ser una cadena no vacía";
  if (!entryDate || isNaN(Date.parse(entryDate)))
    return "El campo 'entryDate' debe ser una fecha válida";
  if (price == null || typeof price !== "number" || isNaN(price) || price < 0)
    return "El campo 'price' debe ser un número válido y no negativo";
  return null;
}

// ✅ CREATE
app.post("/devices", async (req, res) => {
  const {
    client,
    device,
    IMEI,
    status,
    entryDate,
    exitDate,
    warrantLimit,
    price,
    detail,
  } = req.body;

  const validationError = validateEntryData({
    client,
    device,
    IMEI,
    status,
    entryDate,
    price,
  });
  if (validationError) return sendError(res, 400, validationError);

  const newEntry = {
    id: uuidv4(),
    client: client.trim(),
    device: device.trim(),
    IMEI: IMEI.toString().trim(),
    status: status.trim(),
    entryDate,
    exitDate: exitDate && !isNaN(Date.parse(exitDate)) ? exitDate : null,
    warrantLimit:
      warrantLimit && !isNaN(Date.parse(warrantLimit)) ? warrantLimit : null,
    price,
    detail: detail && typeof detail === "string" ? detail.trim() : null,
  };

  try {
    const entries = await readData(DEVICES_FILE);
    entries.push(newEntry);
    await writeData(entries, DEVICES_FILE);
    res.status(201).json(newEntry);
  } catch {
    sendError(res, 500, "Error al guardar la entrada");
  }
});

// 📄 READ ALL
app.get("/devices", async (req, res) => {
  try {
    const entries = await readData(DEVICES_FILE);
    const { search } = req.query;

    if (search) {
      const fuse = new Fuse(entries, {
        keys: ["client", "device"],
        includeScore: true,
        threshold: 0.3,
      });
      const results = fuse.search(search);
      return res.json(results.map((r) => r.item));
    }

    res.json(entries);
  } catch {
    sendError(res, 500, "Error al leer las entradas");
  }
});

// 🔍 READ ONE
app.get("/devices/:id", async (req, res) => {
  try {
    const entries = await readData(DEVICES_FILE);
    const entry = entries.find((e) => e.id === req.params.id);
    if (!entry) return sendError(res, 404, "Entrada no encontrada");
    res.json(entry);
  } catch {
    sendError(res, 500, "Error al leer la entrada");
  }
});

// ✏️ UPDATE
app.put("/devices/:id", async (req, res) => {
  try {
    const entries = await readData(DEVICES_FILE);
    const index = entries.findIndex((e) => e.id === req.params.id);
    if (index === -1) return sendError(res, 404, "Entrada no encontrada");

    const validationError = validateEntryData(req.body);
    if (validationError) return sendError(res, 400, validationError);

    const updated = {
      ...entries[index],
      ...req.body,
      client: req.body.client.trim(),
      device: req.body.device.trim(),
      status: req.body.status.trim(),
      entryDate: entries[index].entryDate,
      exitDate:
        req.body.exitDate && !isNaN(Date.parse(req.body.exitDate))
          ? req.body.exitDate
          : null,
      warrantLimit:
        req.body.warrantLimit && !isNaN(Date.parse(req.body.warrantLimit))
          ? req.body.warrantLimit
          : null,
      detail: req.body.detail?.trim() || null,
    };

    entries[index] = updated;
    await writeData(entries, DEVICES_FILE);
    res.json(updated);
  } catch {
    sendError(res, 500, "Error al actualizar la entrada");
  }
});

// ❌ DELETE
app.delete("/devices/:id", async (req, res) => {
  try {
    const entries = await readData(DEVICES_FILE);
    const newEntries = entries.filter((e) => e.id !== req.params.id);
    await writeData(newEntries, DEVICES_FILE);
    res.json({ result: "Entrada eliminada" });
  } catch {
    sendError(res, 500, "Error al eliminar la entrada");
  }
});

// 📦 PRODUCTS

// 🔎 Obtener productos
app.get("/products", async (req, res) => {
  try {
    const entries = await readData(PRODUCTS_FILE);
    const { search, page = 1 } = req.query;

    if (search) {
      const fuse = new Fuse(entries, {
        keys: ["name"],
        includeScore: true,
        threshold: 0.3,
      });
      const results = fuse.search(search);
      return res.json(results.map((r) => r.item));
    }

    const pageNum = parseInt(page);
    const start = (pageNum - 1) * 10;
    const paginated = entries.slice(start, start + 10);
    res.json(paginated);
  } catch {
    sendError(res, 500, "Error al leer los productos");
  }
});

// 📝 Actualizar producto
app.put("/products/:id", async (req, res) => {
  const { name, price, stock } = req.body;

  if (!name || typeof name !== "string" || name.trim() === "")
    return sendError(res, 400, "El campo 'name' debe ser una cadena no vacía");
  if (price == null || typeof price !== "number" || isNaN(price) || price < 0)
    return sendError(
      res,
      400,
      "El campo 'price' debe ser un número válido y no negativo"
    );
  if (stock == null || typeof stock !== "number" || isNaN(stock) || stock < 0)
    return sendError(
      res,
      400,
      "El campo 'stock' debe ser un número válido y no negativo"
    );

  try {
    const products = await readData(PRODUCTS_FILE);
    const index = products.findIndex((p) => p.id === req.params.id);
    if (index === -1) return sendError(res, 404, "Producto no encontrado");

    const updated = { ...products[index], name: name.trim(), price, stock };
    products[index] = updated;
    await writeData(products, PRODUCTS_FILE);
    res.json(updated);
  } catch {
    sendError(res, 500, "Error al actualizar el producto");
  }
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`API de servicio técnico corriendo en http://localhost:${port}`);
});
