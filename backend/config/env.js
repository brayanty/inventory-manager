import "dotenv/config";
import z from "zod";

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
  PRINTER_URL: z.string().url(),
  BACKEND_URL: z.string().url(),
  FRONTEND_PORT: z.coerce.number().default(5173),
  BACKEND_PORT: z.coerce.number().default(4000),
  PRINTER_PORT: z.coerce.number().default(8000),
  NODE_ENV: z.enum(["development", "production", "test","info","debug"]).default("development"),
  IP_LOCALHOST: z.string().default("127.0.0.1"),
  DATABASE_URL: z.string().url(),
});

export default function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Environment validation error:", z.prettifyError(result.error));
    process.exit(1);

  }

  return { ...result.data };
}
