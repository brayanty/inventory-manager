import {
  deviceSchema,
  deviceUpdateSchema,
} from "../validators/createDevice.schema.js";
import { handleError } from "../modules/handleResponse.js";

export function validateDevice(req, res, next) {
  const result = deviceSchema.safeParse(req.body);

  if (!result.success) {
    handleError(req, res, result.error.message, 400);
    return;
  }

  req.body = result.data;
  next();
}
