import deviceService from "../../services/device.service.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import logger from "../../config/logger.js";

export async function createDevice(req, res) {
  try {
    const { device, statusPrinter } = await deviceService.createDevice(
      req.body,
      req.files,
    );
    return handleSuccess(
      req,
      res,
      { device, statusPrinter },
      "Reparación generada en la base de datos",
      201,
    );
  } catch (error) {
    handleError(
      req,
      res,
      error.message || "Error creando dispositivo",
      error.status || 500,
    );
    logger.error("Error in createDevice controller:", error);
    throw error;
  }
}
