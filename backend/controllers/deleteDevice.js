import { FILES } from "../config/file.js";
import { handleError, handleSuccess } from "../modules/handleResponse.js";
import { overwriteData, readData } from "../utils/file.js";

export default async function deleteDevice(req, res) {
  const deviceID = req.params.id;
  try {
    const devices = await readData(FILES.DEVICES);

    const deviceExists = devices.some((e) => e.id === deviceID);

    if (!deviceExists) {
      return handleError(
        req,
        res,
        "El dispositivo no existe el la base de datos",
        404
      );
    }

    const newdevices = devices.filter((e) => e.id !== deviceID);

    await overwriteData(newdevices, FILES.DEVICES);

    return handleSuccess(req, res, deviceID, "Dispositivo eliminado");
  } catch {
    return handleError(req, res, "Error al eliminar el dispositivo");
  }
}
