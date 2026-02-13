import { create } from "zustand";
import { DeviceEntry } from "../types/technicalService";

interface DeviceFormState {
  deviceForm: DeviceEntry;
  setPriceForm: (price: number) => void;
  setDeviceForm: (
    name: keyof DeviceEntry,
    value: DeviceEntry[keyof DeviceEntry],
  ) => void;
  setDeviceFormEdit: (editDevice: DeviceEntry) => void;
}

export const useDeviceFormStore = create<DeviceFormState>((set) => ({
  deviceForm: {
    client_name: "",
    device: "",
    number_phone: "",
    damage: "",
    model: "",
    imei: "",
    price: 0,
    detail: "",
    faults: [],
    pay: false,
    price_pay: 0,
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
