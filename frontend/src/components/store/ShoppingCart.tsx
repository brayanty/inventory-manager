import { create } from "zustand";

// Interfaz para los productos
interface Product {
  name: string;
  quantity: number;
  category: string;
  entire: number;
  price: number;
  sales: number;
  id?: string;
}

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
