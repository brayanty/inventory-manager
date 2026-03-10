import { create } from "zustand";
import { CategoryList } from "../types/product";

interface CategoryListState {
  categoryList: CategoryList[];
  categorySelect: string;
  setCategoryList: (newCategoryList: CategoryList[]) => void;
  setCategorySelect: (newCategorySelect: string) => void;
}

export const useCategoryListStore = create<CategoryListState>((set) => ({
  categoryList: [],
  categorySelect: "todos",
  setCategoryList: (newCategoryList) => set({ categoryList: newCategoryList }),
  setCategorySelect: (newCategorySelect) =>
    set({ categorySelect: newCategorySelect }),
}));
