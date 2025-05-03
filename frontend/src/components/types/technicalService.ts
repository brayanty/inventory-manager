export interface TechnicalServiceEntry {
  id: string;
  client: string;
  device: string;
  models: string;
  IMEI: number;
  status: string;
  entryDate: string;
  exitDate: string | null;
  warrantLimit: string | null;
  price: number;
  detail: string | null;
}
