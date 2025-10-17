import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const FILES = {
  DEVICES: join(__dirname, "../data.json"),
  PRODUCTS: join(__dirname, "../products.json"),
  CATEGORIES: join(__dirname, "../categories.json"),
  SALES: join(__dirname, "../sales.json"),
  REPAIRS: join(__dirname, "../reparaciones.json"),
};
