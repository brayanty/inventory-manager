import express from "express";
import { handleSuccess, handleError } from "../modules/handleResponse.js";

const router = express.Router();

// Base de datos simulada de usuarios registrados
let registeredUsers = new Set();

// Cargar usuarios de una fuente persistente (localStorage del backend)
const USERS_FILE = process.env.USERS_FILE || "/app/data/registered_users.json";
import fs from "fs/promises";
import path from "path";

// Cargar usuarios al iniciar
async function loadUsers() {
  try {
    const dir = path.dirname(USERS_FILE);
    await fs.mkdir(dir, { recursive: true });
    try {
      const data = await fs.readFile(USERS_FILE, "utf-8");
      registeredUsers = new Set(JSON.parse(data));
      console.log(`✅ Usuarios cargados: ${registeredUsers.size}`);
    } catch (e) {
      console.log("📝 Archivo de usuarios no encontrado, creando nuevo...");
      await saveUsers();
    }
  } catch (error) {
    console.error("Error al cargar usuarios:", error);
  }
}

// Guardar usuarios
async function saveUsers() {
  try {
    const dir = path.dirname(USERS_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      USERS_FILE,
      JSON.stringify(Array.from(registeredUsers), null, 2),
    );
  } catch (error) {
    console.error("Error al guardar usuarios:", error);
  }
}

// Cargar usuarios al iniciar el módulo
loadUsers();

// Registrar un nuevo usuario
router.post("/users/register", async (req, res) => {
  const { userId, username } = req.body;

  if (!userId) {
    return handleError(req, res, "userId es requerido", 400);
  }

  const userIdStr = String(userId);

  if (registeredUsers.has(userIdStr)) {
    return handleSuccess(
      req,
      res,
      { message: "Usuario ya registrado", userId: userIdStr },
      200,
    );
  }

  registeredUsers.add(userIdStr);
  await saveUsers();

  return handleSuccess(req, res, {
    message: "✅ Usuario registrado exitosamente",
    userId: userIdStr,
    username: username || "Usuario Telegram",
  });
});

// Verificar si un usuario está registrado
router.get("/users/verify/:userId", (req, res) => {
  const { userId } = req.params;
  const userIdStr = String(userId);
  const isRegistered = registeredUsers.has(userIdStr);

  return handleSuccess(req, res, {
    userId: userIdStr,
    isRegistered: isRegistered,
    message: isRegistered
      ? "✅ Usuario autorizado"
      : "❌ Usuario no registrado",
  });
});

// Listar todos los usuarios registrados (para administración)
router.get("/users/list", (req, res) => {
  const userList = Array.from(registeredUsers);
  return handleSuccess(req, res, {
    totalUsers: userList.length,
    users: userList,
  });
});

// Eliminar un usuario registrado
router.delete("/users/:userId", (req, res) => {
  const { userId } = req.params;
  const userIdStr = String(userId);

  if (!registeredUsers.has(userIdStr)) {
    return handleError(req, res, "Usuario no encontrado", 404);
  }

  registeredUsers.delete(userIdStr);
  saveUsers();

  return handleSuccess(req, res, {
    message: "✅ Usuario eliminado",
    userId: userIdStr,
  });
});

export default router;
