import { Product } from "./product";

export type TechnicalServiceEntry = {
  id: string;
  client_name: string;
  device: string;
  number_phone: string;
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

export type TechnicalServiceEntryNoID = Partial<
  Omit<TechnicalServiceEntry, "id">
>;

export type newFaults = {
  id: string | number;
};

export type DeviceEntry = {
  client_name: string;
  device: string;
  model: string;
  imei: string;
  number_phone: string;
  price: number;
  price_pay: number;
  detail: string;
  faults: newFaults[];
  pay: boolean;
};
