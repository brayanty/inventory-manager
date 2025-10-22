import { create } from "zustand";

interface PageStoreState {
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  setTotalPages: (page: number) => void;
}

const usePageStore = create<PageStoreState>((set) => ({
  page: 1,
  setPage: (page) => set({ page: page }),
  totalPages: 0,
  setTotalPages: (totalPages) => set({ totalPages: totalPages }),
}));

export default usePageStore;
