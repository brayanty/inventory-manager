import { create } from "zustand";
import { ProductsCart } from "../types/product";

// Definición del estado global
interface ShoppingCartState {
  productsCart: ProductsCart[];
  addProductShopping: (product: ProductsCart) => void;
  removeProductCart: (id: string) => void;
  clearProductCart: () => void;
}

// Uso de create para crear el store
const useShoppingCartStore = create<ShoppingCartState>((set) => ({
  productsCart: [],
  addProductShopping: (product: ProductsCart) => {
    set((state) => {
      const productExist = state.productsCart.find((p) => p.id === product.id);
      if (productExist) {
        const newProductCart = state.productsCart.map((i) => {
          return i.id === product.id ? product : i;
        });
        return { productsCart: newProductCart };
      }

      return { productsCart: [...state.productsCart, product] };
    });
  },
  removeProductCart: (id) =>
    set((state) => ({
      productsCart: state.productsCart.filter((product) => product.id !== id),
    })),
  clearProductCart: () => set(() => ({ productsCart: [] })),
}));

export default useShoppingCartStore;
