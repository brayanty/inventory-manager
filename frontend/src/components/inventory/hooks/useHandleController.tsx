import useShoppingCartStore from "@/components/store/ShoppingCart";
import { Product } from "@/components/types/product";
import { toast } from "react-toastify";

export const useHandleController = () => {
  const { productsCart, addProductShopping } = useShoppingCartStore();

  const setShoppingCart = (product: Product) => {
    if (product.stock === 0 || !product) {
      toast.error("No hay stock disponible");
      return;
    }
    const indexSearch = productsCart.findIndex(
      (productCart) => productCart.id === product.id,
    );
    const newProductCart = { ...product, amount: 1 };

    if (indexSearch === -1) {
      addProductShopping(newProductCart);
      toast.success("Se agrego correctamente al carrito");
      return;
    } else {
      toast.warn("Ya existe en el carrito");
    }
  };
  return { setShoppingCart };
};
