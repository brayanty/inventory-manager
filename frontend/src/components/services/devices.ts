import {
  DeviceEntry,
  TechnicalServiceEntry,
  TechnicalServiceEntryNoID,
} from "../types/technicalService";
import { API_ENDPOINT } from "../constants/endpoint.tsx";

const DEVICE_ENDPOINT = `${API_ENDPOINT}devices`;

export async function getDevice(id: string) {
  const response = await fetch(DEVICE_ENDPOINT + "/" + id);
  const data = await response.json();
  if (data.success) {
    return data.data;
  }
}
export async function createDevice(device: DeviceEntry) {
  const deviceToSend = {
    ...device,
    faults: device.faults.map(f => ({ id: parseInt(f.id) })),
  };
  const response = await fetch(DEVICE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(deviceToSend),
  });
  const data = await response.json();
  return data;
}
export async function updateDevice(
  id: string | number,
  deviceStatus: DeviceEntry,
) {
  const deviceToSend = {
    ...deviceStatus,
    faults: deviceStatus.faults.map(f => ({ id: parseInt(f.id) })),
  };
  const response = await fetch(DEVICE_ENDPOINT + "/" + id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(deviceToSend),
  });
  const { success, status, data, message } = await response.json();
  if (!success || !status || status !== 201) {
    return { success: false, message };
  }
  return { success, data, message };
}

export async function updateDeviceStatus(
  id: string | number,
  deviceStatus: TechnicalServiceEntry["repair_status"],
) {
  const response = await fetch(DEVICE_ENDPOINT + "/" + id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(deviceStatus),
  });
  const { success, status, data, message } = await response.json();
  if (!success || !status || status !== 201) {
    return { success: false, message };
  }
  return { success, data, message };
}

export async function updateStatusDevice(
  id: string,
  device: TechnicalServiceEntryNoID,
) {
  const response = await fetch(DEVICE_ENDPOINT + "/status/" + id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(device),
  });
  const { data, success, message } = await response.json();
  return { data, success, message };
}

export async function deleteDevice(id: string) {
  const response = await fetch(DEVICE_ENDPOINT + "/" + id, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  if (data.success) {
    return data.data;
  }
}
export async function searchDevices(query: string, page: number) {
  const response = await fetch(
    DEVICE_ENDPOINT + "?" + "search=" + query + `&page=${page}`,
  );
  const data = await response.json();
  if (data.success) {
    return data.data;
  }
}
export async function getDeviceByName(name: string) {
  const response = await fetch(DEVICE_ENDPOINT + "?" + "name=" + name);
  const data = await response.json();
  if (data.success) {
    return data.data;
  }
}
export async function getDeviceById(id: string) {
  const response = await fetch(DEVICE_ENDPOINT + "/" + id);
  const data = await response.json();
  if (data.success) {
    return data.data;
  }
}
export async function getDeviceByStatus(status: string) {
  const response = await fetch(DEVICE_ENDPOINT + "?" + "status=" + status);
  const data = await response.json();
  if (data.success) {
    return data.data;
  }
}
