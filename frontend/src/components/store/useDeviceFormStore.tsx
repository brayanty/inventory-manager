import { create } from "zustand";
import { DeviceEntry } from "../types/technicalService";

interface DeviceFormState {
  deviceForm: DeviceEntry;

  updateField: <K extends keyof DeviceEntry>(
    field: K,
    value: DeviceEntry[K],
  ) => void;

  setPrice: (price: number) => void;

  setDeviceFormEdit: (editDevice: DeviceEntry) => void;

  resetForm: () => void;
}

const initialState: DeviceEntry = {
  client_name: "",
  device: "",
  number_phone: "",
  model: "",
  imei: "",
  price: 0,
  detail: "",
  faults: [],
  pay: false,
  price_pay: 0,
};

export const useDeviceFormStore = create<DeviceFormState>((set) => ({
  deviceForm: initialState,

  updateField: (field, value) => {
    set((state) => {
      const updated = {
        ...state.deviceForm,
        [field]: value,
      };

      if (updated.price === updated.price_pay && updated.price > 0) {
        updated.pay = true;
      } else {
        updated.pay = false;
      }

      return { deviceForm: updated };
    });
  },

  setPrice: (price) =>
    set((state) => ({
      deviceForm: {
        ...state.deviceForm,
        price,
      },
    })),

  setDeviceFormEdit: (editDevice) => set({ deviceForm: editDevice }),

  resetForm: () => set({ deviceForm: initialState }),
}));
