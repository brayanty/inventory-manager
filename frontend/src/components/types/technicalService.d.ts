import { Product } from "./product";

export type TechnicalServiceEntry = {
  id: string;
  client_name: string;
  device: string;
  number_phone: string;
  damage: string;
  model: string;
  imei: string;
  repair_status: "Reparado" | "Sin Solución" | "En Revisión";
  output_status: boolean;
  entry_date: string;
  exit_date: string | null;
  warrant_limit: string | null;
  price: number;
  detail: string;
  faults: Product[];
  pay: boolean;
  price_pay: number;
};

export type DeviceEntry = Pick<
  TechnicalServiceEntry,
  | "client_name"
  | "device"
  | "number_phone"
  | "damage"
  | "model"
  | "imei"
  | "price"
  | "detail"
  | "faults"
  | "pay"
  | "price_pay"
>;

export type TechnicalServiceEntryNoID = Partial<
  Omit<TechnicalServiceEntry, "id">
>;
