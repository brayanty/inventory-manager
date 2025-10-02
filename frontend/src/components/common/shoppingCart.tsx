import Button from "@/components/common/button";
import useShoppingCartStore from "@/components/store/ShoppingCart";
import { formatCOP } from "@/components/utils/format";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ProductBase, ProductsCart } from "../types/product";
import { soldProducts } from "../services/products";
import useProductsStore from "../store/products";

const ShoppingCart = () => {
  const { productsCart, addProductShopping, clearProductCart } =
    useShoppingCartStore();
  const [priceTotal, setPriceTotal] = useState(0);
  const { addProducts } = useProductsStore();

  useEffect(() => {
    if (productsCart && productsCart.length > 0) {
      const total = productsCart.reduce(
        (acc, product) => acc + product.price * product.amount,
        0
      );
      setPriceTotal(total);
    } else {
      setPriceTotal(0);
    }
  }, [productsCart]);

  if (!productsCart) {
    toast("No hay productos");
    return null;
  }

  // funcion para aumentar el valor de la cantidad de productos a vender
  const handleAmount = (id: string, value: number) => {
    const product = productsCart.find((product) => product.id === id);

    if (product) {
      const updatedProduct = {
        ...product,
        amount: value > product.total ? product.total : value,
      };
      addProductShopping(updatedProduct);
    }
  };

  const handleDelete = (id: string) => {
    const updatedProducts = productsCart.filter((product) => product.id !== id);
    clearProductCart();
    updatedProducts.forEach((product) => addProductShopping(product));
  };

  const renderProductRow = (product: ProductsCart) => {
    return (
      <tr key={product.id} className="even:bg-[rgba(36,40,50,0.03)]">
        <td className="px-4 py-2 text-[14px]">
          {product.name.length > 20
            ? product.name.slice(0, 20) + "..."
            : product.name}
        </td>
        <td className="px-4 py-2 text-[14px]">
          {product.category.length > 5
            ? product.category.slice(0, 5) + "..."
            : product.category}
        </td>
        <td className="px-4 py-2 text-[14px]">
          <input
            id={product.name}
            className="w-[60px] text-center bg-[rgba(36,40,50,1)] border border-gray-300 rounded px-1"
            type="number"
            max={product.total}
            min={1}
            onChange={(e) =>
              handleAmount(product.id, Number(e.currentTarget.value))
            }
            value={product.amount}
          />
        </td>
        <td className="px-4 py-2 text-[14px]">
          {formatCOP(product.price * product.amount)}
        </td>
        <td className="px-4 py-2 text-[14px]">
          <Button
            onClick={() => {
              handleDelete(product.id);
            }}
            className="bg-red-600 cursor-pointer"
          >
            Eliminar
          </Button>
        </td>
      </tr>
    );
  };

  // Función para manejar la venta de productos
  // Se envia los id de productos vendidos al backend
  const saleProducts = async () => {
    if (productsCart.length === 0) {
      toast("No hay productos en el carrito");
      return;
    }
    try {
      const soldProductId = productsCart.map((item) => {
        const { id, amount } = item;
        return { id, amount };
      });

      const updatedProducts = (await soldProducts(
        soldProductId
      )) as ProductBase[];
      if (!updatedProducts) {
        toast("Error al vender los productos");
        return;
      }
      addProducts(updatedProducts as ProductBase[]);
      toast("Productos vendidos exitosamente");
      clearProductCart();
    } catch {
      toast("Oooh no, se cayo el server");
    }
  };

  return (
    <div className="grid grid-cols-1 h-[500px] relative text-[#7e8590] bg-[rgba(36,40,50,1)] shadow-[0px_0px_15px_rgba(0,0,0,0.09)]">
      <div className="sticky top-0 row-span-2 p-2 text-xs text-gray-700 bg-gray-400/95 dark:bg-[rgb(62,67,80)] dark:text-gray-300">
        <header className="p-4">
          <h4 className="text-center text-xl font-bold">Ticket</h4>
        </header>
      </div>

      <main className="row-span-8 row-start-3 min-h-[30vh] no-scrollbar overflow-y-scroll px-2">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-200/90 text-black sticky top-0 z-30">
            <tr>
              <th className="px-4 py-2">Producto</th>
              <th className="px-4 py-2">Categoria</th>
              <th className="px-4 py-2">Cantidad</th>
              <th className="px-4 py-2">Valor</th>
              <th className="px-4 py-2">Opciones</th>
            </tr>
          </thead>
          <tbody>
            {productsCart.length > 0 ? (
              productsCart.map((product) => renderProductRow(product))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-[14px] text-gray-500"
                >
                  No hay productos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </main>

      <footer className="col-start-1 row-start-11 row-span-2 text-gray-700 dark:text-gray-300 bg-gray-400 dark:bg-[rgb(62,67,80)] p-2 flex items-center justify-between">
        <div>
          <div>Total: {formatCOP(priceTotal)}</div>
        </div>
        <div className="flex justify-center gap-2">
          <Button onClick={() => saleProducts()} className="bg-green-500">
            Vender
          </Button>
          <Button onClick={clearProductCart} className="bg-red-600">
            Limpiar
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default ShoppingCart;
