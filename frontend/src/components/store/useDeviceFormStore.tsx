import { create } from "zustand";
import { DeviceEntry } from "../types/technicalService";

interface DeviceFormState {
  deviceForm: DeviceEntry;
  setPriceForm: (price: number) => void;
  setDeviceForm: (name: keyof DeviceEntry, value: DeviceEntry[keyof DeviceEntry]) => void;
  setDeviceFormEdit: (editDevice: DeviceEntry) => void;
}

export const useDeviceFormStore = create<DeviceFormState>((set) => ({
  deviceForm: {
    client: "",
    device: "",
    damage: "",
    model: "",
    IMEI: "",
    price: 0,
    detail: "",
    faults: [],
    pay: false,
  },
  setPriceForm: (price) =>
    set((state) => ({
      deviceForm: {
        ...state.deviceForm,
        price,
      },
    })),
  setDeviceForm: (name, value) =>
    set((state) => ({
      deviceForm: {
        ...state.deviceForm,
        [name]: value,
      },
    })),
  setDeviceFormEdit: (editDevice) => set({ deviceForm: editDevice }),
}));
