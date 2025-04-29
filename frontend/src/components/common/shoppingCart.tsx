import Button from "@/components/common/button";
import useShoppingCartStore from "@/components/store/ShoppingCart";
import formatCOP from "@/components/utils/format";
import { useEffect, useState } from "react";

const ShoppingCart = () => {
  const { productsCart } = useShoppingCartStore();
  const [priceTotal, setPriceTotal] = useState(0);

  useEffect(() => {
    if (productsCart && productsCart.length > 0) {
      const total = productsCart.reduce(
        (acc, product) => acc + product.price,
        0
      );
      setPriceTotal(total);
    } else {
      setPriceTotal(0);
    }
  }, [productsCart]);

  if (!productsCart) return "Nada que ver aqui";

  const renderProductsSale = (product) => {
    return (
      <li className="flex justify-evenly items-center gap-2">
        <div className="text-[14px]">{product.name.slice(0, 20)}...</div>
        <span className="text-[14px]">{product.category.slice(0, 5)}</span>
        <span className="text-[14px]">{formatCOP(product.price)}</span>
      </li>
    );
  };

  if (!productsCart) return "sorry";
  return (
    <div className="grid grid-cols-1 grid-rows-12 gap-1 relative  text-[#7e8590] h-full max-h-full max-w-full bg-[rgba(36,40,50,1)] shadow-[0px_0px_15px_rgba(0,0,0,0.09)]">
      <div className="sticky top-0 row-span-2 p-2 text-xs text-gray-700 uppercase bg-gray-400 dark:bg-[rgb(62,67,80)] dark:text-gray-300">
        <header className="">
          <h4 className="text-center">Ticket</h4>
        </header>
        <div className="p-[10px] text-xs uppercase flex justify-between items-center gap-2">
          <h6>Producto</h6>
          <p>categoria</p>
          <p>Valor</p>
        </div>
      </div>
      <main className="row-span-8 row-start-3 p-2 h-full max-h-full no-scrollbar overflow-y-scroll overflow-hidden">
        <ul>{productsCart.map((product) => renderProductsSale(product))}</ul>
      </main>
      <footer className="col-start-1 row-start-11 row-span-2 text-gray-700 dark:text-gray-300 bg-gray-400 dark:bg-[rgb(62,67,80)] p-2 flex items-center justify-between">
        <div>
          <div>Total: {formatCOP(priceTotal)}</div>
        </div>
        <div className="flex justify-center  gap-2">
          <Button className="bg-green-500">Vender</Button>
          <Button>Limpiar</Button>
        </div>
      </footer>
    </div>
  );
};

export default ShoppingCart;
