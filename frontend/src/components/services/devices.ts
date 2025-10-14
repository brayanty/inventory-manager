import { TechnicalServiceEntryNoID } from "../types/technicalService";

const DEVICE_ENDPOINT = "http://localhost:3000/devices";

export async function getDevice(id: string) {
  const response = await fetch(DEVICE_ENDPOINT + "/" + id);
  const data = await response.json();
  return data;
}
export async function createDevice(device: TechnicalServiceEntryNoID) {
  const response = await fetch(DEVICE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(device),
  });
  const data = await response.json();
  return data;
}
export async function updateDevice(
  id: string,
  device: TechnicalServiceEntryNoID
) {
  const response = await fetch(DEVICE_ENDPOINT + "/" + id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(device),
  });
  const data = await response.json();
  return data;
}
export async function deleteDevice(id: string) {
  const response = await fetch(DEVICE_ENDPOINT + "/" + id, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  return data;
}
export async function searchDevices(query: string) {
  const response = await fetch(DEVICE_ENDPOINT + "?" + "search=" + query);
  const data = await response.json();
  return data;
}
export async function getDeviceByName(name: string) {
  const response = await fetch(DEVICE_ENDPOINT + "?" + "name=" + name);
  const data = await response.json();
  return data;
}
export async function getDeviceById(id: string) {
  const response = await fetch(DEVICE_ENDPOINT + "/" + id);
  const data = await response.json();
  return data;
}
export async function getDeviceByStatus(status: string) {
  const response = await fetch(DEVICE_ENDPOINT + "?" + "status=" + status);
  const data = await response.json();
  return data;
}
