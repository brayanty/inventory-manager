export function parseFormDevice(deviceData: any, deviceFiles: File[] | null) {
  const deviceToSend = {
    ...deviceData,
    faults: deviceData.faults.map((f: any) => ({ id: parseInt(f.id) })),
  };

  const formDevice = new FormData();
  formDevice.append("device", JSON.stringify(deviceToSend));
  deviceFiles?.forEach((file) => {
    formDevice.append("images", file);
  });
  return formDevice;
}
