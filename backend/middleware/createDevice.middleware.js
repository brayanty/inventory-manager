import { deviceSchema } from "../validators/createDevice.schema.js";
import { handleError } from "../modules/handleResponse.js";

export function validateDevice(req, res, next) {
  const result = deviceSchema.safeParse(req.body);

  if (!result.success) {
    return handleError(req, res, "No hay se recibieron datos validos", 404);
  }

  req.body = result.data;
  next();
}
