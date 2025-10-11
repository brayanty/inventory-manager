export type TechnicalServiceEntry = {
  id: string;
  client: string;
  device: string;
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
  faults: string[];
  pay: boolean;
};

export type TechnicalServiceEntryNoID = Partial<
  Omit<TechnicalServiceEntry, "id">
>;
