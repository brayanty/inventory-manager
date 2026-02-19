import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import deviceService from "../../services/device.service.js";

export default async function updateDevice(req, res) {
  const { id: deviceID } = req.params;
  const updateFields = req.body;

  try {
    const { device } = await deviceService.updateDevice(updateFields, deviceID);
    return handleSuccess(
      req,
      res,
      device,
      "Dispositivo actualizado correctamente",
      201,
    );
  } catch (error) {
    return handleError(
      req,
      res,
      error.message || "Error actualizando dispositivo",
      error.status || 500,
    );
  }
}
