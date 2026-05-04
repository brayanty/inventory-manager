import {
    deviceSchema,
    deviceUpdateSchema,
} from "../validators/createDevice.schema.js";
import { handleError } from "../modules/handleResponse.js";
import logger from "../config/logger.js";
import z from "zod";

const validate = (schema) => (req, res, next) => {
    try {
        let dataDevice = JSON.parse(req.body.device);

        const result = schema.safeParse(dataDevice);

        if (!result.success) {
            logger.error("Validation failed:" + z.prettifyError(result.error));
            return handleError(req, res, result.error.message, 400);
        }

        req.body.device = result.data;
        next();
    } catch (error) {
        logger.error("Error validating device data:" + error.message);
        throw error;
    }
};

export const validateDevice = validate(deviceSchema);
export const validateUpdateDevice = validate(deviceUpdateSchema);
