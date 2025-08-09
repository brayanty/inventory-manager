import { create } from "zustand";

interface PageStoreState {
  page: number;
  setPage: (page: number) => void;
}

const usePageStore = create<PageStoreState>((set) => ({
  page: 1,
  setPage: (page) => set({ page: page }),
}));

export default usePageStore;
