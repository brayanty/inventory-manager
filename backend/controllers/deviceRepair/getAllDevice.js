import Fuse from "fuse.js";
import { FILES } from "../../config/file.js";
import { readData } from "../../utils/file.js";
import { handleError, handleSuccess } from "../../modules/handleResponse.js";

export default async function getAllDevice(req, res) {
  try {
    const devices = await readData(FILES.DEVICES);
    const { search } = req.query;

    if (search) {
      const fuse = new Fuse(devices, {
        keys: ["client", "device"],
        includeScore: true,
        threshold: 0.3,
      });
      const results = fuse.search(search);
      return handleSuccess(req, res, results);
    }
    handleSuccess(req, res, devices);
  } catch {
    handleError(req, res, "Error al leer las entradas");
  }
}
