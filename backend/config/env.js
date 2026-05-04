import "dotenv/config";
import z from "zod";

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
  PRINTER_URL: z.string().url(),
  BACKEND_URL: z.string().url(),

});

export default function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((e) => `${e.path[0]}: ${e.message}`)
      .join("\n");

    throw new Error("Env validation error:\n" + errors);
  }

  return result.data;
}
