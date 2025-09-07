import { create } from "zustand";
import { Product } from "../types/product";

// Definición del estado global
interface ShoppingCartState {
  productsCart: Product[];
  addProductShopping: (product: Product) => void;
  removeProductCart: (id: string) => void;
  clearProductCart: () => void;
}

// Uso de create para crear el store
const useShoppingCartStore = create<ShoppingCartState>((set) => ({
  productsCart: [],
  addProductShopping: (product) =>
    set((state) => ({ productsCart: [...state.productsCart, product] })),
  removeProductCart: (id) =>
    set((state) => ({
      productsCart: state.productsCart.filter((product) => product.id !== id),
    })),
  clearProductCart: () => set(() => ({ productsCart: [] })),
}));

export default useShoppingCartStore;
