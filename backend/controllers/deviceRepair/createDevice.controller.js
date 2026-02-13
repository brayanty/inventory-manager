import deviceService from "../../services/device.service.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";

export async function createDevice(req, res) {
  try {
    const { device, statusPrinter } = await deviceService.createDevice(
      req.body,
    );
    return handleSuccess(req, res, device, statusPrinter, 201);
  } catch (error) {
    return handleError(
      req,
      res,
      error.message || "Error creando dispositivo",
      error.status || 500,
    );
  }
}
