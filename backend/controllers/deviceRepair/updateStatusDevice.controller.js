import deviceService from "../../services/device.service.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";

export async function updateStatusDevice(req, res) {
  const deviceID = req.params.id;
  const { output_status } = req.body;

  if (isNaN(deviceID)) {
    return handleError(req, res, "ID de dispositivo inválido", 400);
  }
  try {
    const device = await deviceService.updateDeliveredDevice(
      output_status,
      deviceID,
    );

    return handleSuccess(
      req,
      res,
      device,
      "Dispositivo actualizado correctamente",
      200,
    );
  } catch (err) {
    return handleError(
      req,
      res,
      err.message || "Error actualizando dispositivo",
      err.status || 500,
    );
  }
}
