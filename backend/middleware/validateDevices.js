import { z } from "zod";

const faultSchema = z.object({
  id: z.string().uuid(),
  sales: z.number().int().min(0),
  name: z.string().min(3),
  category: z.string(),
  total: z.number().int().min(0),
  price: z.number().positive(),
});

export const deviceSchema = z.object({
  client_name: z.string().min(3),
  device: z.string().min(2),
  model: z.string().min(2),
  IMEI: z.string().regex(/^\d{15}$/, "IMEI debe tener 15 dígitos"),
  repair_status: z.number().int().min(0),
  entryDate: z.string().date(),
  exitDate: z.string().date().nullable(),
  warrantLimit: z.string().date().nullable(),
  price: z.number().positive(),
  price_pay: z.number().min(0),
  detail: z.string().optional(),
  faults: z.array(faultSchema).min(1),
});

export function validateDevice(req, res, next) {
  const result = deviceSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Datos inválidos",
      errors: result.error.flatten(),
    });
  }

  req.body = result.data;
  next();
}
