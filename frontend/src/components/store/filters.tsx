import { create } from "zustand";

interface SearchStoreState {
  search: string;
  setSearch: (newSearch: string) => void;
}

export const useSearchStore = create<SearchStoreState>((set) => ({
  search: "",
  setSearch: (newSearch) => set({ search: newSearch }),
}));
