import { create } from "zustand";

interface SearchStoreState {
  search: string;
  setSearch: (newSearch: string) => void;
}

export const useSearchStore = create<SearchStoreState>((set) => ({
  search: "",
  setSearch: (newSearch) => set({ search: newSearch }),
}));

interface CategoryState {
  category: string;
  setCategory: (category: string) => void;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  category: "",
  setCategory: (newCategory) => set({ category: newCategory }),
}));
