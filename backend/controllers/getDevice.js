import { FILES } from "../config/file.js";
import { handleError, handleSuccess } from "../modules/handleResponse.js";
import { readData } from "../utils/file.js";

export default async function getDevice(req, res) {
  const deviceID = req.params.id;
  const devices = await readData(FILES.DEVICES);
  try {
    const device = devices.find((e) => {
      return e.id === deviceID;
    });

    if (!devices) {
      return handleError(
        req,
        res,
        "No se encontro el dispositivo en la base de datos"
      );
    }
    handleSuccess(req, res, device);
  } catch {
    handleError(req, res, "Error al leer la entrada");
  }
}
