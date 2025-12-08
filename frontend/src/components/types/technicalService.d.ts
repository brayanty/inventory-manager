import { Product } from "./product";

export type TechnicalServiceEntry = {
  id: string;
  client: string;
  device: string;
  cel: string;
  damage: string;
  model: string;
  IMEI: string;
  status: "Reparado" | "Sin Solución" | "En Revisión";
  output: boolean;
  entryDate: string;
  exitDate: string | null;
  warrantLimit: string | null;
  price: number;
  detail: string;
  faults: Product[];
  pay: boolean;
  pricePay: number;
};

export type DeviceEntry = Pick<
  TechnicalServiceEntry,
  | "client"
  | "device"
  | "cel"
  | "damage"
  | "model"
  | "IMEI"
  | "price"
  | "detail"
  | "faults"
  | "pay"
  | "pricePay"
>;

export type TechnicalServiceEntryNoID = Partial<
  Omit<TechnicalServiceEntry, "id">
>;
