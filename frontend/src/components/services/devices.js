const DEVICE_ENDPOINT = "http://localhost:3000/entries";

export async function getDevice(id) {
  const response = await fetch(DEVICE_ENDPOINT + "/" + id);
  const data = await response.json();
  return data;
}
export async function createDevice(device) {
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
export async function updateDevice(id, device) {
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
export async function deleteDevice(id) {
  const response = await fetch(DEVICE_ENDPOINT + "/" + id, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  return data;
}
export async function searchDevices(search) {
  const response = await fetch(DEVICE_ENDPOINT + "?" + "search=" + search);
  const data = await response.json();
  return data;
}
export async function getDeviceByName(name) {
  const response = await fetch(DEVICE_ENDPOINT + "?" + "name=" + name);
  const data = await response.json();
  return data;
}
export async function getDeviceById(id) {
  const response = await fetch(DEVICE_ENDPOINT + "?" + "id=" + id);
  const data = await response.json();
  return data;
}
export async function getDeviceByStatus(status) {
  const response = await fetch(DEVICE_ENDPOINT + "?" + "status=" + status);
  const data = await response.json();
  return data;
}
