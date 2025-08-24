import { create } from "zustand";
import { Product } from "../types/product";

// Definición del estado global
interface ProductsState {
  products: Product[];
  addProducts: (product: Product[]) => void;
  removeProduct: (id: string) => void;
  clearProduct: () => void;
}

// Uso de create para crear el store
const useProductsStore = create<ProductsState>((set) => ({
  products: [],
  addProducts: (newproducts) => set({ products: newproducts }),
  removeProduct: (id) =>
    set((state) => ({
      products: state.products.filter((product) => product.id !== id),
    })),
  clearProduct: () => set(() => ({ products: [] })),
}));

export default useProductsStore;
