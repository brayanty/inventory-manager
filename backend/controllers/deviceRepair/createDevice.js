import { handleError, handleSuccess } from "../../modules/handleResponse.js";
import { postTechnicalServicePrinter } from "../../services/printerService.js";
import pool from "../../config/db.js";

export default async function createDevice(req, res) {
  const {
    client_name,
    device,
    model,
    IMEI,
    repair_status,
    price,
    price_pay,
    detail,
    faults,
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Enviar datos la base de datos
    const { rows, rowCount } = await client.query(
      "INSERT INTO device (client_name,device,model,imei,repair_status,price,detail,faults,price_pay) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING*",
      [
        client_name,
        device,
        model,
        IMEI,
        repair_status,
        parseFloat(price),
        detail,
        JSON.stringify(faults),
        parseFloat(price_pay),
      ],
    );
    //Verifica que se guardaron los datos
    if (rowCount != 1)
      return handleError(
        req,
        res,
        "No se pudo guardar el registro de dispositivo",
        404,
      );
    // Nombre de las fallas para imprimir
    const repairs = rows.filter((product) => {
      return faults.some((fault) => fault.name === product.name);
    });
    //Datos para impresora
    const statusPrinter = await postTechnicalServicePrinter(
      {
        name: rows[0].client_name,
        device: rows[0].device,
        model: rows[0].model,
        pay: rows[0].pay,
        pricePay: rows[0].pricePay,
        id: rows[0].id,
      },
      repairs,
    );

    await client.query("COMMIT");

    return handleSuccess(req, res, rows[0], statusPrinter);
  } catch (error) {
    await client.query("ROLLBACK");
    return handleError(req, res, "Hubo un error al crear el dispositivo", 500);
  } finally {
    client.release();
  }
}
