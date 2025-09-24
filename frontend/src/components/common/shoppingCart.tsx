import Button from "@/components/common/button";
import useShoppingCartStore from "@/components/store/ShoppingCart";
import { formatCOP } from "@/components/utils/format";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ProductsCart } from "../types/product";
import { soldProducts } from "../services/products";

const ShoppingCart = () => {
  const { productsCart, addProductShopping, clearProductCart } =
    useShoppingCartStore();
  const [priceTotal, setPriceTotal] = useState(0);

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

  if (!productsCart) return toast("No hay productos");

  // funcion para aumentar el valor de la cantidad de productos a vender
  const handleAmount = (id: string, value: number) => {
    console.log(value, id);
    const product = productsCart.find((product) => product.id === id);

    if (product) {
      const updatedProduct = {
        ...product,
        amount: value > product.total ? product.total : value,
      };
      addProductShopping(updatedProduct);
    }
  };

  const renderProductsSale = (product: ProductsCart, index: number) => {
    return (
      <li key={index} className="flex justify-evenly items-center gap-2">
        <div className="text-[14px]">{product.name.slice(0, 20)}...</div>
        <span className="text-[14px]">{product.category.slice(0, 5)}</span>
        <div className="text-[14px] flex justify-center gap-2">
          <label htmlFor={product.name}>
            <input
              id={product.name}
              className="w-[40px] text-center bg-[rgba(36,40,50,1)] border border-gray-300 rounded"
              type="number"
              max={product.total}
              min={1}
              onChange={(e) =>
                handleAmount(product.id, Number(e.currentTarget.value))
              }
              value={product.amount}
            />
          </label>
        </div>
        <span className="text-[14px]">
          {formatCOP(product.price * product.amount)}
        </span>
      </li>
    );
  };

  // Función para manejar la venta de productos
  // Se envia los id de productos vendidos al backend
  const saleProducts = () => {
    if (productsCart.length === 0) toast("No hay productos en el carrito");
    try {
      const soldProductId = productsCart.map((item) => {
        const { id, amount } = item;
        return { id, amount };
      });
      soldProducts(soldProductId);
      toast("Productos vendidos exitosamente");
      clearProductCart();
    } catch {
      toast("Oooh no, se cayo el server");
    }
  };

  return (
    <div className="grid grid-cols-1 grid-rows-12 gap-1 relative  text-[#7e8590] h-full max-h-full max-w-full bg-[rgba(36,40,50,1)] shadow-[0px_0px_15px_rgba(0,0,0,0.09)]">
      <div className="sticky top-0 row-span-2 p-2 text-xs text-gray-700 bg-gray-400 dark:bg-[rgb(62,67,80)] dark:text-gray-300">
        <header className="p-4">
          <h4 className="text-center text-xl font-bold">Ticket</h4>
        </header>
        <div className="p-[5px] text-xs uppercase flex justify-between items-center gap-2">
          <h6>Producto</h6>
          <p>categoria</p>
          <p>Cantidad</p>
          <p>Valor</p>
        </div>
      </div>
      <main className="row-span-8 row-start-3 h-full max-h-full no-scrollbar overflow-y-scroll overflow-hidden">
        <ul>
          {productsCart.map((product, index) =>
            renderProductsSale(product, index)
          )}
        </ul>
      </main>
      <footer className="col-start-1 row-start-11 row-span-2 text-gray-700 dark:text-gray-300 bg-gray-400 dark:bg-[rgb(62,67,80)] p-2 flex items-center justify-between">
        <div>
          <div>Total: {formatCOP(priceTotal)}</div>
        </div>
        <div className="flex justify-center gap-2">
          <Button onClick={() => saleProducts()} className="bg-green-500">
            Vender
          </Button>
          <Button className="bg-red-600" onClick={clearProductCart}>
            Limpiar
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default ShoppingCart;
