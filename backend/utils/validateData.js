export const validateEntryData = ({
  client,
  device,
  model,
  IMEI,
  status,
  entryDate,
  price,
}) => {
  if (!client || typeof client !== "string" || client.trim() === "")
    return "El campo 'client' debe ser una cadena no vacía";
  if (!device || typeof device !== "string" || device.trim() === "")
    return "El campo 'device' debe ser una cadena no vacía";
  if (!model || typeof model !== "string" || model.trim() === "")
    return "El campo 'model' debe ser una cadena no vacía";
  if (!IMEI || IMEI.toString().trim().length !== 15)
    return "El IMEI debe tener 15 caracteres";
  if (!status || typeof status !== "string" || status.trim() === "")
    return "El campo 'status' debe ser una cadena no vacía";
  if (!entryDate || isNaN(Date.parse(entryDate)))
    return "El campo 'entryDate' debe ser una fecha válida";
  if (price == null || typeof price !== "number" || isNaN(price) || price < 0)
    return "El campo 'price' debe ser un número válido y no negativo";
  return null;
};
