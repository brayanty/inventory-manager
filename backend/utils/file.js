import fs from "fs/promises";
import path from "path";
// Funciones de archivo
export async function readData(file) {
  try {
    const data = await fs.readFile(file, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function writeData(newData, file) {
  const filePath = path.resolve(file);

  let newDataFile = (await readData(filePath)) ?? [];
  if (!Array.isArray(newDataFile)) {
    throw new Error("El archivo no contiene un array válido");
  }

  newDataFile.push(newData);

  try {
    await fs.writeFile(filePath, JSON.stringify(newDataFile, null, 2), "utf-8");
    console.log("✅ Datos escritos correctamente");
  } catch (err) {
    console.error("❌ Error al escribir datos:", err);
    throw err;
  }
}
