import { Product, ProductsCart } from "@/components/types/product";
import { toast } from "react-toastify";

export const useHandleController = (
  productsCart: ProductsCart[],
  addProductShopping: (product: ProductsCart) => void
) => {
  const handleAddShoppingCart = (product: Product) => {
    const indexSearch = productsCart.findIndex(
      (productCart) => productCart.id === product.id
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
  return { handleAddShoppingCart };
};
