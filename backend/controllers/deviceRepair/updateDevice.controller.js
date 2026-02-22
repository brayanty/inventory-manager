import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import deviceService from "../../services/device.service.js";

export default async function updateDevice(req, res) {
  const deviceID = req.params.id;
  const updateFields = req.body;

  if (isNaN(deviceID)) {
    return handleError(req, res, "ID de dispositivo inválido", 400);
  }
  try {
    const { device } = await deviceService.updateDevice(updateFields, deviceID);
    return handleSuccess(
      req,
      res,
      device,
      "Dispositivo actualizado correctamente",
      201,
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
