import { z } from "zod";

const faultSchema = z.object({
  id: z.number().int().optional(),
});

export const deviceSchema = z.object({
  client_name: z.string().min(3),
  device: z.string().min(2),
  model: z.string().min(2),
  imei: z.string(15).optional(),
  number_phone: z.string().optional(),
  price: z.float64().min(0),
  price_pay: z.float64().min(0),
  detail: z.string().optional(),
  faults: z.array(faultSchema).optional(),
  images: z.json().optional(),
});

export const deviceUpdateSchema = deviceSchema
  .partial()
  .safeExtend({ repair_status: z.string().optional() });
