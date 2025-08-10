const express = require("express");
const path = require("path");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const Fuse = require("fuse.js");
const app = express();
const port = 3000;
const { validateEntryData } = require("./utils/validateData.js");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const users = require("./users/user.js");
const authenticateToken = require("./middleware/auth.js");
const { readData, writeData } = require("./utils/file.js");
require("dotenv").config();

// Archivos JSON usados
const DEVICES_FILE = path.join(__dirname, "data.json");
const PRODUCTS_FILE = path.join(__dirname, "products.json");

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

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(403).json({ message: "Credenciales inválidas" });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  res.json({ token });
});

// Ruta protegida
app.get("/protected", authenticateToken, (req, res) => {
  res.json({ message: "Acceso concedido", user: req.user });
});

// ✅ CREATE
app.post("/devices", async (req, res) => {
  const {
    client,
    device,
    model,
    IMEI,
    status,
    output,
    entryDate,
    exitDate,
    warrantLimit,
    price,
    detail,
  } = req.body;

  const validationError = validateEntryData({
    client,
    device,
    model,
    IMEI,
    status,
    output,
    entryDate,
    price,
  });
  if (validationError) return sendError(res, 400, validationError);

  const newEntry = {
    id: uuidv4(),
    client: client.trim(),
    device: device.trim(),
    model: model && typeof model === "string" ? model.trim() : null,
    IMEI: IMEI.toString().trim(),
    status: status.trim(),
    output: false,
    entryDate,
    exitDate: exitDate && !isNaN(Date.parse(exitDate)) ? exitDate : null,
    warrantLimit:
      warrantLimit && !isNaN(Date.parse(warrantLimit)) ? warrantLimit : null,
    price,
    detail: detail && typeof detail === "string" ? detail.trim() : null,
  };

  try {
    await writeData(newEntry, DEVICES_FILE);
    res.status(201).json(newEntry);
  } catch {
    sendError(res, 500, "Error al guardar el producto");
  }
});

// READ ALL
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

// READ ONE
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

// UPDATE
app.put("/devices/:id", async (req, res) => {
  try {
    const entries = await readData(DEVICES_FILE);
    const index = entries.findIndex((e) => e.id === req.params.id);
    if (req.body.output) {
      return sendError(
        res,
        400,
        "No se puede actualizar un dispositivo entregado"
      );
    }
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

// DELETE
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

// PRODUCTS

// Obtener productos con paginación y búsqueda
app.get("/products", async (req, res) => {
  try {
    const entries = await readData(PRODUCTS_FILE);
    const { search, page = 1, limit = 10 } = req.query;

    let filtered = entries;

    // Filtrar si hay búsqueda
    if (search) {
      const fuse = new Fuse(entries, {
        keys: ["name"],
        includeScore: true,
        threshold: 0.3,
      });
      filtered = fuse.search(search).map((r) => r.item);
    }

    // Calcular paginado
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limitNum);
    const start = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(start, start + limitNum);

    res.json({
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages,
      data: paginated,
    });
  } catch (error) {
    sendError(res, 500, "Error al leer los productos");
  }
});

// Crear un nuevo producto
app.post("/products", async (req, res) => {
  const { name, category, total, price } = req.body;
  const newPrice = parseFloat(price);
  if (isNaN(newPrice) || newPrice < 0) {
    return res
      .status(400)
      .json({ error: "El precio debe ser un número válido y no negativo" });
  }
  if (!name || typeof name !== "string" || name.trim() === "")
    return sendError(res, 400, "El campo 'name' debe ser una cadena no vacía");
  if (!category || typeof category !== "string" || category.trim() === "")
    return sendError(
      res,
      400,
      "El campo 'category' debe ser una cadena no vacía"
    );
  if (total == null || typeof total !== "number" || isNaN(total) || total < 0)
    return sendError(
      res,
      400,
      "El campo 'total' debe ser un número válido y no negativo"
    );

  const newProduct = {
    id: uuidv4(),
    sales: 0,
    name: name,
    category: category,
    total: total,
    price: price,
  };

  try {
    writeData(newProduct, PRODUCTS_FILE);
    res.json(newProduct, 201);
  } catch {
    sendError(res, 404);
  }
});

// Actualizar producto
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
