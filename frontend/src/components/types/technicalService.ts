export type TechnicalServiceEntry = {
  id: string;
  client: string;
  device: string;
  model: string;
  IMEI: string;
  status:
    | "En reparación"
    | "Reparado"
    | "No reparado"
    | "Entregado"
    | "En revisión";
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
