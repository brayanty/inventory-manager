import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import { readData, writeData } from "../../utils/file.js";
import { FILES } from "../../config/file.js";
import { v4 as uuidv4 } from "uuid";
import { postTechnicalServicePrinter } from "../../services/printerService.js";

export default async function createDevice(req, res) {
  const {
    client,
    device,
    model,
    IMEI,
    status,
    output,
    entryDate,
    exitDate,
    warrantLimit,
    price,
    detail,
    faults,
    pay,
  } = req.body;

  // Descomentar si quieres usar validación
  // const validationError = validateEntryData({
  //   client,
  //   device,
  //   model,
  //   IMEI,
  //   status,
  //   output,
  //   entryDate,
  //   price,
  //   faults
  // });
  // if (validationError) return handleError(req, res, validationError, 400);

  try {
    const devices = await readData(FILES.DEVICES);

    // Verifica que el IMEI no se encuentre
    if (devices.find((device) => device.IMEI === IMEI)) {
      handleError(
        req,
        res,
        `El IMEI ${IMEI} ya se encuentra en la base de datos`,
        409
      );
      return;
    }

    const products = await readData(FILES.PRODUCTS_FILE);

    if (isNaN(price)) {
      handleError(req, res, "El precio del dispositivo es inválido", 406);
      return;
    }

    const newDevice = {
      id: uuidv4(),
      client: client.trim(),
      device: device.trim(),
      model: model && typeof model === "string" ? model.trim() : null,
      IMEI: IMEI.toString().trim(),
      status: status.trim(),
      entryDate,
      exitDate: exitDate && !isNaN(Date.parse(exitDate)) ? exitDate : null,
      warrantLimit:
        warrantLimit && !isNaN(Date.parse(warrantLimit)) ? warrantLimit : null,
      price: price,
      detail: detail && typeof detail === "string" ? detail.trim() : null,
      faults: faults,
      pay: typeof pay === "boolean" ? pay : false,
      output: output,
    };

    const repairs = products.filter((e) => faults.includes(e.name));

    const statusPrinter = await postTechnicalServicePrinter(
      {
        name: newDevice.client,
        device: newDevice.device,
        pay: pay,
        id: newDevice.id,
      },
      repairs
    );

    await writeData(newDevice, FILES.DEVICES);
    handleSuccess(req, res, newDevice, statusPrinter);
  } catch (error) {
    handleError(req, res, "Hubo un error al conectar con la impresora");
    console.error("Hubo un error al conectar con la impresora:", error);
  }
}
