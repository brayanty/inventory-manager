import { z } from "zod";

const faultSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().min(3),
  category: z.string(),
  stock: z.number().int().min(0),
  price: z
    .string()
    .regex(
      /^\d+(\.\d{1,2})?$/,
      "El precio debe ser un número válido con hasta dos decimales",
    ),
});

export const deviceSchema = z.object({
  client_name: z.string().min(3),
  device: z.string().min(2),
  model: z.string().min(2),
  imei: z.string().regex(/^\d{15}$/, "IMEI debe tener 15 dígitos"),
  number_phone: z
    .string()
    .regex(/[0-9]{10}$/, "Número de teléfono debe tener 10 dígitos"),
  price: z.number().positive(),
  price_pay: z.number().min(0),
  detail: z.string().optional(),
  faults: z.array(faultSchema).min(1),
});
