import Paginator from "@/components/common/paginator";
import { TableMain } from "@/components/common/tableComponets";
import { Title } from "@/components/common/title.tsx";
import { useLodingSaleProducts } from "@/components/hooks/useLodingSaleProducts";
import { getTopProduct } from "@/components/services/products";
import { useEffect, useRef, useState } from "react";

interface TopProduct {
  id: string;
  name: string;
  sales: string;
}
export default function SalesStatistics() {
  const { soldProducts, handleDate, date } = useLodingSaleProducts();
  const dateRef = useRef<HTMLInputElement | null>(null);

  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  useEffect(() => {
    async function getTopProducts() {
      const newTopProducts = await getTopProduct(10);
      setTopProducts(newTopProducts);
    }
    getTopProducts();
  }, []);
  return (
    <div className="flex flex-row w-full h-full p-4 gap-2 text-white">
      <div className="w-full flex flex-col">
        {/* Ventas por mes */}
        <header className="m-2 flex justify-center flex-col items-center">
          <Title
            title={"Productos vendidos por mes"}
            size="text-xl"
            fontType="bold"
            type="5"
          />
          <div className="flex flex-row justify-center items-center gap-4 mt-4">
            <div className="flex flex-row justify-center items-center gap-4 mt-4">
              <input
                ref={dateRef}
                value={date}
                onChange={(e) => handleDate(e.target.value)}
                type="date"
                className="input"
              />
            </div>
          </div>
        </header>
        <main className="">
          {soldProducts && (
            <TableMain
              itemsTitle={[
                "Fecha",
                "Producto",
                "Categoría",
                "Precio Unitario",
                "Total Vendido",
              ]}
              itemsBody={soldProducts}
            />
          )}
        </main>
        <Paginator />
      </div>
      <div className="border rounded-2xl">
        {/* Productos mas vendidos */}
        <header>
          <h3 className="text-center text-lg font-semibold mb-2 p-1">
            TOP ventas en el último mes
          </h3>
        </header>
        <main className="p-3 flex gap-4">
          <ul>
            {topProducts &&
              topProducts.map((product) => (
                <li key={product.id}>
                  {product.name} - {product.sales}
                </li>
              ))}
          </ul>
        </main>
      </div>
    </div>
  );
}
