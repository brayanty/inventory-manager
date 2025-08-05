export type TechnicalServiceEntry = {
  id: string;
  client: string;
  device: string;
  model: string;
  IMEI: string;
  status:
  | "Reparado" | "Sin Solución" | "En Revisión";
  output: boolean;
  entryDate: string;
  exitDate: string | null;
  warrantLimit: string | null;
  price: number;
  detail: string;
};

export type TechnicalServiceEntryNoID = Partial<
  Omit<TechnicalServiceEntry, "id">
>;
