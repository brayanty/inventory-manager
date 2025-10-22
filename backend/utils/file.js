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
    console.error("El archivo no contiene un array válido");
  }

  newDataFile.push(newData);

  try {
    await fs.writeFile(filePath, JSON.stringify(newDataFile, null, 2), "utf-8");
  } catch (err) {
    console.error("Error al escribir datos:", err);
  }
}

// Sobrescribe todo el archivo con los datos nuevos
export async function overwriteData(newData, file) {
  const filePath = path.resolve(file);

  if (!Array.isArray(newData)) {
    console.error("Los datos a escribir deben ser un array");
  }

  try {
    await fs.writeFile(filePath, JSON.stringify(newData, null, 2), "utf-8");
  } catch (err) {
    console.error("Error al sobrescribir datos:", err);
    throw err;
  }
}
