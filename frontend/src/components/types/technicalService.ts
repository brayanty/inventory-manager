export type TechnicalServiceEntry = {
  id?: string; // Optional for new devices, required for existing ones
  client: string;
  device: string;
  models: string;
  IMEI: string;
  status: "En reparación" | "Reparado" | "No reparado" | "Entregado";
  entryDate: string;
  exitDate: string | null;
  warrantLimit: string | null;
  price: number;
  detail: string;
};
