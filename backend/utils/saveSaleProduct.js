import { FILES } from "../config/file.js";
import { writeData } from "./file.js";
import { v4 as uuidv4 } from "uuid";

export function saveSale(soldProducts) {
  const date = new Date().toLocaleDateString("es-CO");

  const sale = {
    id: uuidv4(),
    date: date,
    sold: soldProducts,
  };

  writeData(sale, FILES.SALES);
}
