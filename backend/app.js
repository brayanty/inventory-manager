const express = require("express");
const fs = require("fs").promises; // Usamos fs.promises para operaciones asíncronas
const path = require("path");
const cors = require("cors");
const { v4: uuidv4, v4 } = require("uuid");
const morgan = require("morgan"); // Para logging de solicitudes
const rateLimit = require("express-rate-limit"); // Para límite de solicitudes
const Fuse = require("fuse.js");

const app = express();
const port = 3000;

app.use(express.json());
app.use(morgan("short")); // Logging de solicitudes HTTP

app.use(
  cors({
    origin: "http://localhost:5173", // Allow only this origin
  })
);
// Límite de solicitudes: m áximo 100 solicitudes por IP en 15 minutos
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // Máximo 100 solicitudes por IP
  message: { error: "Demasiadas solicitudes, intenta de nuevo más tarde" },
});
app.use(limiter);

const dataFile = path.join(__dirname, "data.json");
// Función para enviar respuestas de error estandarizadas
const sendError = (res, status, message) =>
  res.status(status).json({ error: message });

// Leer archivo de forma asíncrona
async function readData() {
  try {
    const data = await fs.readFile(dataFile, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error al leer o parsear datos:", err);
    return [];
  }
}

// Escribir archivo de forma asíncrona
async function writeData(newData) {
  try {
    await fs.writeFile(dataFile, JSON.stringify(newData), "utf8");
    console.log("Datos escritos correctamente");
  } catch (err) {
    console.error("Error al escribir datos:", err);
    throw err;
  }
}

// Validar entrada para POST y PUT
function validateEntryData({ client, device, status, entryDate, price }) {
  if (!client || typeof client !== "string" || client.trim() === "") {
    return "El campo 'client' debe ser una cadena no vacía";
  }
  if (!device || typeof device !== "string" || device.trim() === "") {
    return "El campo 'device' debe ser una cadena no vacía";
  }
  if (!status || typeof status !== "string" || status.trim() === "") {
    return "El campo 'status' debe ser una cadena no vacía";
  }
  if (!entryDate || isNaN(Date.parse(entryDate))) {
    return "El campo 'entryDate' debe ser una fecha válida";
  }
  if (price == null || typeof price !== "number" || isNaN(price) || price < 0) {
    return "El campo 'price' debe ser un número válido y no negativo";
  }
  return null;
}

// ✅ CREATE
app.post("/devices", async (req, res) => {
  const {
    client,
    device,
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
    status,
    entryDate,
    exitDate,
    warrantLimit,
    price,
    detail,
  });
  if (validationError) {
    return sendError(res, 400, validationError);
  }

  const newEntry = {
    id: uuidv4(9),
    client: client.trim(),
    device: device.trim(),
    status: status.trim(),
    entryDate,
    exitDate: exitDate && !isNaN(Date.parse(exitDate)) ? exitDate : null,
    warrantLimit:
      warrantLimit && !isNaN(Date.parse(warrantLimit)) ? warrantLimit : null,
    price,
    detail: detail && typeof detail === "string" ? detail.trim() : null,
  };

  try {
    const entries = await readData();
    entries.push(newEntry);
    await writeData(entries);
    res.status(201).json(newEntry);
  } catch (err) {
    sendError(res, 404, "Error al guardar la entrada");
  }
});

// 📄 READ ALL
app.get("/devices", async (req, res) => {
  try {
    const entries = await readData();
    const { search } = req.query;

    if (search) {
      const fuse = new Fuse(entries, {
        keys: ["client", "device"],
        includeScore: true,
        threshold: 0.3,
      });
      const results = fuse.search(search);
      const filteredEntries = results.map((result) => result.item);
      return res.json(filteredEntries);
    }
  } catch (err) {
    sendError(res, 404, "Error al leer las entradas");
  } finally {
    res.json(await readData());
  }
});

// 🔍 READ ONE
app.get("/devices/:id", async (req, res) => {
  try {
    const entries = await readData();
    const entry = entries.find((e) => e.id === req.params.id);
    if (!entry) return sendError(res, 404, "Entrada no encontrada");
    res.json(entry);
  } catch (err) {
    sendError(res, 404, "Error al leer la entrada");
  }
});

// ✏️ UPDATE
app.put("/devices/:id", async (req, res) => {
  try {
    const entries = await readData();
    const index = entries.findIndex((e) => e.id === req.params.id);
    if (index === -1) return sendError(res, 404, "Entrada no encontrada");

    const validationError = validateEntryData(req.body);
    if (validationError) {
      return sendError(res, 400, validationError);
    }

    const updated = {
      ...entries[index],
      ...req.body,
      client: req.body.client.trim(),
      device: req.body.device.trim(),
      status: req.body.status.trim(),
      exitDate:
        req.body.exitDate && !isNaN(Date.parse(req.body.exitDate))
          ? req.body.exitDate
          : entries[index].exitDate,
      warrantLimit:
        req.body.warrantLimit && !isNaN(Date.parse(req.body.warrantLimit))
          ? req.body.warrantLimit
          : entries[index].warrantLimit,
      detail:
        req.body.detail && typeof req.body.detail === "string"
          ? req.body.detail.trim()
          : entries[index].detail,
      price:
        req.body.price != null &&
        typeof req.body.price === "number" &&
        !isNaN(req.body.price) &&
        req.body.price >= 0
          ? req.body.price
          : entries[index].price,
      entryDate: new Date().toISOString().split("T")[0],
    };

    entries[index] = updated;
    await writeData(entries);
    res.json(updated);
  } catch (err) {
    sendError(res, 404, "Error al actualizar la entrada");
  }
});

// ❌ DELETE
app.delete("/devices/:id", async (req, res) => {
  try {
    const device = await readData();
    const newDevices = device.filter((e) => e.id !== req.params.id);
    console.log(newDevices);
    await writeData(newDevices);
    res.json({ result: "Entrada eliminada" });
  } catch (err) {
    sendError(res, 404, "Error al eliminar la entrada");
  }
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`API de servicio técnico corriendo en http://localhost:${port}`);
});
