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
const { readData, writeData, overwriteData } = require("./utils/file.js");
const { postProductsPrinter } = require("./services/printerService.js");
require("dotenv").config();

// Archivos JSON usados
const DEVICES_FILE = path.join(__dirname, "data.json");
const PRODUCTS_FILE = path.join(__dirname, "products.json");
const CATEGORIES_FILE = path.join(__dirname, "categories.json");
const SALES_FILE = path.join(__dirname, "sales.json");
const DEVICES_REPAIR_AVAILABLE_FILE = path.join(__dirname, "reparaciones.json");

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
    faults,
  } = req.body;

  // const validationError = validateEntryData({
  //   client,
  //   device,
  //   model,
  //   IMEI,
  //   status,
  //   output,
  //   entryDate,
  //   price,
  //   faults
  // });
  // if (validationError) return sendError(res, 400, validationError);

  const newEntry = {
    id: uuidv4(),
    client: client.trim(),
    device: device.trim(),
    model: model && typeof model === "string" ? model.trim() : null,
    IMEI: IMEI.toString().trim(),
    status: status.trim(),
    entryDate,
    exitDate: exitDate && !isNaN(Date.parse(exitDate)) ? exitDate : null,
    warrantLimit:
      warrantLimit && !isNaN(Date.parse(warrantLimit)) ? warrantLimit : null,
    price,
    detail: detail && typeof detail === "string" ? detail.trim() : null,
    faults: faults,
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
  const { id } = req.params;
  const updateFields = req.body;

  try {
    const products = await readData(DEVICES_FILE);

    const index = products.findIndex((e) => e.id === id);
    if (index === -1) {
      return sendError(res, 404, "Dispositivo no encontrado");
    }
    const updatedProduct = { ...products[index], ...updateFields };

    const newProducts = [...products];
    newProducts[index] = updatedProduct;

    await overwriteData(newProducts, DEVICES_FILE);

    res.json(updatedProduct);
  } catch {
    sendError(res, 500, "Error al actualizar la entrada");
  }
});

// DELETE
app.delete("/devices/:id", async (req, res) => {
  try {
    const entries = await readData(DEVICES_FILE);
    const newEntries = entries.filter((e) => e.id !== req.params.id);
    await overwriteData(newEntries, DEVICES_FILE);
    res.json({ result: "Entrada eliminada" });
  } catch {
    sendError(res, 500, "Error al eliminar la entrada");
  }
});

// Tipos de reparaciones disponibles
app.get("/repairTypeAvailable", async (req, res) => {
  const search = req.query.search; // Usar req.query para obtener parámetros de consulta
  try {
    if (!search) {
      return res
        .status(400)
        .json({ message: "El parámetro de búsqueda está vacío" });
    }

    const repairTypeAvailable = await readData(PRODUCTS_FILE);

    const filterRepairType = repairTypeAvailable.filter((repair) => {
      return repair.category == "repuestos" || repair.category == "display";
    });
    const fuse = new Fuse(filterRepairType, {
      keys: ["name"], // Ajustar las claves según los campos correctos
      includeScore: true,
      threshold: 0.3, // Umbral para búsqueda difusa
    });

    const results = fuse.search(search);

    if (!results.length) {
      return res
        .status(404)
        .json({ message: "No se encontraron resultados para la búsqueda" });
    }

    res.json(results.map((r) => r.item));
  } catch (error) {
    console.error("Error al leer las reparaciones disponibles:", error);
    res
      .status(500)
      .json({ message: "Error al leer las reparaciones disponibles" });
  }
});

app.post("/devices/repairTypeAvailable", async (req, res) => {
  const { type } = req.body;
  const types = await readData(DEVICES_REPAIR_AVAILABLE_FILE);

  const typeExists = types.find(
    (t) => t.type.toLowerCase() === type.trim().toLowerCase()
  );

  if (typeExists) {
    return res
      .status(400)
      .json({ error: `El tipo de reparación "${type}" ya existe` });
  }

  if (!type || typeof type !== "string" || type.trim() === "")
    return sendError(res, 400, "El campo 'type' debe ser una cadena no vacía");

  const newType = {
    id: uuidv4(),
    type: type.trim(),
  };

  types.push(newType);

  try {
    await overwriteData(newType, DEVICES_REPAIR_AVAILABLE_FILE);
    res.status(201).json(newType);
  } catch {
    sendError(res, 500, "Error al guardar el tipo de reparación");
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
  const { name, category } = req.body;
  const price = parseFloat(req.body.price);
  const total = parseFloat(req.body.total);
  const categoriesList = await readData(CATEGORIES_FILE);
  const categoryExists = categoriesList.find(
    (cat) => cat.category === category
  );
  if (!categoryExists) {
    return res
      .status(400)
      .json({ error: "La categoría proporcionada no existe" });
  }

  if (isNaN(price) || price < 0) {
    return res
      .status(400)
      .json({ error: "El precio debe ser un número válido y no negativo" });
  }
  if (!name || typeof name !== "string" || name.trim() === "")
    return sendError(res, 400, "El campo 'name' debe ser una cadena no vacía");
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
    category: categoryExists.category,
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
app.post("/products/sold", async (req, res) => {
  try {
    const soldProducts = req.body;

    // Validar entrada
    if (!Array.isArray(soldProducts) || soldProducts.length === 0) {
      return res.status(400).json({
        message: "Se requiere un arreglo no vacío de productos vendidos",
      });
    }

    // Validar cada producto
    for (const item of soldProducts) {
      if (!item.id || typeof item.id !== "string" || item.id.trim() === "") {
        return res.status(400).json({
          message: `ID inválido para el producto: ${JSON.stringify(item)}`,
        });
      }
      if (!Number.isInteger(item.amount) || item.amount <= 0) {
        return res.status(400).json({
          message: `Cantidad inválida para el producto con ID ${item.id}`,
        });
      }
    }

    // Leer datos de productos
    const productsData = await readData(PRODUCTS_FILE);

    // Verificar si todos los IDs de productos existen
    const invalidProduct = soldProducts.find(
      (item) => !productsData.some((product) => product.id === item.id)
    );
    if (invalidProduct) {
      return res.status(404).json({
        message: `Producto con ID ${invalidProduct.id} no encontrado`,
      });
    }

    // Verificar inventario y preparar actualizaciones
    const updatedProducts = productsData.map((product) => {
      const soldItem = soldProducts.find((item) => item.id === product.id);
      if (soldItem) {
        if (product.total < soldItem.amount) {
          return res.status(400).json({
            message: `No hay suficiente stock para el producto ${product.name} (disponible: ${product.total}, solicitado: ${soldItem.amount})`,
          });
        }
        return {
          ...product,
          total: product.total - soldItem.amount,
          sales: product.sales + soldItem.amount,
        };
      }
      return product;
    });

    // Verificar si ya se envió una respuesta (por ejemplo, por falta de stock)
    if (res.headersSent) {
      return; // Evitar procesamiento adicional si se envió una respuesta
    }

    // Preparar datos para postProductsPrinter
    const printableProducts = soldProducts.map((item) => {
      const product = productsData.find((p) => p.id === item.id);
      return {
        name: product.name,
        price: product.price,
        amount: item.amount,
      };
    });
    const sale = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      products: soldProducts,
    };
    // Agregar o guardar en un archivo de ventas
    await writeData(sale, SALES_FILE);

    // Guardar productos actualizados
    await overwriteData(updatedProducts, PRODUCTS_FILE);

    try {
      // Enviar a la impresor
      await postProductsPrinter(printableProducts);
    } catch (err) {
      console.error("Error al imprimir los productos:", err);
      // No fallamos la solicitud, solo registramos el error
    }

    res.status(201).json(updatedProducts);
  } catch (err) {
    sendError(res, 500, "Error al procesar la venta");
  }
});

// Crear una nueva categoria
app.get("/products/categories", async (req, res) => {
  try {
    const categories = await readData(CATEGORIES_FILE);
    res.json(categories);
  } catch {
    sendError(res, 500, "Oops hubo un error en el servidor");
  }
});

app.post("/products/categories", async (req, res) => {
  let { category } = req.body;
  const categories = await readData(CATEGORIES_FILE);

  // Normalizamos a minúsculas y recortamos espacios
  category = category.trim().toLowerCase();

  // Verificar si ya existe la categoría (en minúsculas)
  const existCategory = categories.find(
    (cat) => cat.category.toLowerCase() === category
  );
  if (existCategory) {
    return res.json({
      message: `La categoría "${category}" ya está en la lista`,
    });
  }

  // Crear nueva categoría
  const newCategory = {
    id: uuidv4(),
    category, // ya está en minúsculas
  };

  try {
    categories.push(newCategory); // agregamos al array
    await writeData(newCategory, CATEGORIES_FILE); // guardamos array completo
    res.status(201).json(newCategory);
  } catch (err) {
    sendError(res, 500, "Error al guardar la categoría");
  }
});

app.delete("/products/categories/:id", async (req, res) => {
  try {
    const categories = await readData(CATEGORIES_FILE);
    const newCategories = categories.filter((c) => c.id !== req.params.id);
    await writeData(newCategories, CATEGORIES_FILE);
    res.json({ result: "Categoría eliminada" });
  } catch {
    sendError(res, 500, "Error al eliminar la categoría");
  }
});

app.delete("/products/:id", async (req, res) => {
  try {
    const products = await readData(PRODUCTS_FILE);
    const newProducts = products.filter((p) => p.id !== req.params.id);
    await overwriteData(newProducts, PRODUCTS_FILE);
    res.json({ result: "Producto eliminado" });
  } catch {
    sendError(res, 500, "Error al eliminar el producto");
  }
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`API de servicio técnico corriendo en http://localhost:${port}`);
});
