import { create } from "zustand";

interface DeviceFormImg {
  deviceImgs: File[];
  setDeviceImgs: (img: File[]) => void;
  removeDeviceImg: (name: string) => void;
  removeDeviceAllImgs: () => void;
}

const useDeviceFormImgStore = create<DeviceFormImg>((set) => ({
  deviceImgs: [],
  setDeviceImgs: (deviceImgs) => set({ deviceImgs: deviceImgs }),
  removeDeviceImg: (name) =>
    set((state) => ({
      deviceImgs: state.deviceImgs.filter((img) => img.name !== name),
    })),
  removeDeviceAllImgs: () => set({ deviceImgs: [] }),
}));

export default useDeviceFormImgStore;
