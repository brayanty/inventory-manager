import Button from "@/components/common/button";
import Paginator from "@/components/common/paginator";
import { TableMain } from "@/components/common/tableComponets";
import { Title } from "@/components/common/title.tsx";
import { getSoldProducts } from "@/components/services/products";
import { formatCOP } from "@/components/utils/format";
import { useEffect, useRef, useState } from "react";
import usePageStore from "@/components/store/page.tsx";

function useLodingSaleProducts() {
  const [soldProducts, setProducts] = useState();
  const { page, setPage, setTotalPages } = usePageStore();
  const [date, setDate] = useState<Date>(new Date());

  const handleDate = (date: Date) => {
    const newDate = new Date(date);
    setDate(newDate);
  };

  useEffect(() => {
    async function getProduct() {
      const pageData = await getSoldProducts(
        date.toISOString().split("T")[0],
        page
      );
      const newProducts = pageData.data.soldProduct.flatMap((product) =>
        product.sold.map((soldItem) => ({
          title: product.date,
          id: soldItem.id,
          items: [
            soldItem.name,
            soldItem.category,
            formatCOP(soldItem.price),
            soldItem.amount,
          ],
        }))
      );
      setProducts(newProducts);
      setPage(pageData.data.page);
      setTotalPages(pageData.data.totalPages);
    }
    getProduct();
  }, [page, setPage, setTotalPages, date]);
  return { soldProducts, handleDate };
}

export default function SalesStatistics() {
  const { soldProducts, handleDate, date } = useLodingSaleProducts();
  const dateRef = useRef<HTMLInputElement | null>(null);

  if (soldProducts === undefined) {
    return <div>Cargando...</div>;
  }

  const handleFilter = () => {
    const value = dateRef.current?.value;
    const newDate = value ? new Date(value) : new Date();
    handleDate(newDate);
    console.log(newDate);
  };

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
              <input ref={dateRef} value={date} type="date" className="input" />
            </div>
            <div className="flex items-center justify-center">
              <Button onClick={() => handleFilter()} className="bg-blue-600">
                Filtrar
              </Button>
            </div>
          </div>
        </header>
        <main className="">
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
