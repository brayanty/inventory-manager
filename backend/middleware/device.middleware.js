import { deviceSchema, deviceUpdateSchema } from "../validators/createDevice.schema.js";
import { handleError } from "../modules/handleResponse.js";
import logger from "../config/logger.js";

const validate = (schema) => (req, res, next) => {
  try {
    let data = { ...req.body };

    const result = schema.safeParse(data);

    if (!result.success) {
      logger.error("Validation failed:", result.error.format());
      return handleError(req, res, result.error.message, 400);
    }

    req.body = result.data;
    next();
  } catch (error) {
    logger.error("Error validating date:", error.message);
    handleError(req, res, "Error validating date:", 400);
  }
};

export const validateDevice = validate(deviceSchema);
export const validateUpdateDevice = validate(deviceUpdateSchema);