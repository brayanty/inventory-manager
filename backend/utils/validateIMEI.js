import { FILES } from "../config/file.js";

async function validateIMEI(IMEI) {
  if (!IMEI) return false;

  const devices = await readData(FILES.DEVICES);

  if (/^(\d{15})$/.test(IMEI) || IMEI === "000000000000000") {
    return false;
  }

  if (
    IMEI !== "000000000000000" &&
    devices.some((device) => (device.IMEI || "").trim() === IMEI)
  ) {
    return false;
  }

  return true;
}

export default validateIMEI;
