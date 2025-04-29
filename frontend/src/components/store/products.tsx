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
interface ProductsState {
  products: Product[];
  addProduct: (product: Product) => void;
  removeProduct: (id: string) => void;
  clearProduct: () => void;
}

// Uso de create para crear el store
const useProductsStore = create<ProductsState>((set) => ({
  products: [],
  addProduct: (product) =>
    set((state) => ({ products: [...state.products, product] })),
  removeProduct: (id) =>
    set((state) => ({
      products: state.products.filter((product) => product.id !== id),
    })),
  clearProduct: () => set(() => ({ products: [] })),
}));

export default useProductsStore;
