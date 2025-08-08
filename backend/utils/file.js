import fs from  "fs/promises" 
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
   const newDataFile = await readData(file);
    newDataFile.push(newData);

  try {
    await fs.writeFile(
      file,
      JSON.stringify(newDataFile, null, 2)
    );
    console.log("Datos escritos correctamente");
  } catch (err) {
    console.error("Error al escribir datos:", err);
    throw err;
  }
}