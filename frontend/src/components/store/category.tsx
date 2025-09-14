import { create } from "zustand";

interface categoryList {
  category: { spanich: string; english: string };
}

interface CategoryListState {
  categoryList: categoryList[];
  categorySelect: string;
  setCategoryList: (newCategoryList: categoryList[]) => void;
  setCategorySelect: (newCategorySelect: string) => void;
}

export const useCategoryListStore = create<CategoryListState>((set) => ({
  categoryList: [],
  categorySelect: "all",
  setCategoryList: (newCategoryList) => set({ categoryList: newCategoryList }),
  setCategorySelect: (newCategorySelect) =>
    set({ categorySelect: newCategorySelect }),
}));
