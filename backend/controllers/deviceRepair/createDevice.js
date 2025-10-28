import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import { readData, writeData } from "../../utils/file.js";
import { FILES } from "../../config/file.js";
import { v4 as uuidv4 } from "uuid";
import { postTechnicalServicePrinter } from "../../services/printerService.js";

export default async function createDevice(req, res) {
  const deviceData = req.body;
  // {
  //   client,
  //   device,
  //   model,
  //   IMEI,
  //   status,
  //   output,
  //   entryDate,
  //   exitDate,
  //   warrantLimit,
  //   price,
  //   detail,
  //   faults,
  //   pay,
  // } = req.body;

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
    if (devices.find((device) => device.IMEI === deviceData.IMEI)) {
      if (deviceData.IMEI !== "000000000000000") {
        handleError(
          req,
          res,
          `El IMEI ${deviceData.IMEI} ya se encuentra en la base de datos`,
          409
        );
        return;
      }
    }

    const products = await readData(FILES.PRODUCTS);

    if (deviceData.price < 0) {
      handleError(req, res, "El precio del dispositivo es inválido", 406);
      return;
    }

    const newDevice = {
      id: uuidv4(),
      client: deviceData.client,
      device: deviceData.device,
      model:
        deviceData.model && typeof deviceData.model === "string"
          ? deviceData.model
          : null,
      IMEI: deviceData.IMEI,
      status: deviceData.status,
      entryDate: deviceData.entryDate,
      exitDate:
        deviceData.exitDate && !isNaN(Date.parse(deviceData.exitDate))
          ? deviceData.exitDate
          : null,
      warrantLimit:
        deviceData.warrantLimit && !isNaN(Date.parse(deviceData.warrantLimit))
          ? deviceData.warrantLimit
          : null,
      price: deviceData.price,
      detail:
        deviceData.detail && typeof deviceData.detail === "string"
          ? deviceData.detail
          : null,
      faults: deviceData.faults,
      pay: typeof deviceData.pay === "boolean" ? deviceData.pay : false,
      output: deviceData.output,
    };

    const repairs = products.filter((product) => {
      console.log(product);
      return deviceData.faults.some((fault) => fault === product.name);
    });

    const statusPrinter = await postTechnicalServicePrinter(
      {
        name: newDevice.client,
        device: newDevice.device,
        pay: newDevice.pay,
        id: newDevice.id,
      },
      repairs
    );

    await writeData(newDevice, FILES.DEVICES);
    handleSuccess(req, res, newDevice, statusPrinter);
  } catch (error) {
    handleError(req, res, "Hubo un error al crear el dispositivo", 500);
    console.error("Hubo un error al conectar con la impresora:", error);
  }
}
