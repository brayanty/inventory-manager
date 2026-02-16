import Paginator from "@/components/common/paginator";
import { TableMain } from "@/components/common/tableComponets";
import { Title } from "@/components/common/title.tsx";
import { getSoldProducts } from "@/components/services/products";
import { useEffect, useRef, useState } from "react";
import usePageStore from "@/components/store/page.tsx";
import { toast } from "react-toastify";
import { TableItem } from "@/components/types/tableComponets";

function useLodingSaleProducts() {
  const [soldProducts, setProducts] = useState<TableItem[]>([]);
  const { page, setPage, setTotalPages } = usePageStore();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]); // Formato 2026-02-15

  const handleDate = (date: string) => {
    console.log("Selected date:", date);
    setDate(date);
  };

  useEffect(() => {
    async function getProduct() {
      const {
        totalPages,
        totalItems = 0,
        page: currentPage,
        soldProduct = [],
        success = false,
      } = await getSoldProducts(date, page);

      if (!success) {
        setProducts([]);
        toast.error("No se encontraron datos de productos vendidos");
        return;
      }
      if (totalItems <= 0) {
        toast.warn("No hay productos");
        throw new Error("No hay productos");
      }
      const newProducts: TableItem[] = soldProduct.map((product) => ({
        title: product.sold_at.split("T")[0],
        id: product.id,
        items: [
          product.category,
          product.product_name,
          product.price,
          product.sales.toString(),
        ],
      }));
      console.log(newProducts);
      setProducts(newProducts);
      setPage(currentPage);
      setTotalPages(totalPages);
    }
    getProduct();
  }, [page, setPage, setTotalPages, date]);
  return { soldProducts, handleDate, date };
}

export default function SalesStatistics() {
  const { soldProducts, handleDate, date } = useLodingSaleProducts();
  const dateRef = useRef<HTMLInputElement | null>(null);

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
            <li>Display iphone 11</li>
            <li>Display iphone 11</li>
            <li>Display iphone 11</li>
          </ul>
        </main>
      </div>
    </div>
  );
}
