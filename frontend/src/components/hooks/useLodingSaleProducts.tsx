import { getSoldProducts } from "@/components/services/products";
import usePageStore from "@/components/store/page.tsx";
import { toast } from "react-toastify";
import { TableItem } from "@/components/types/tableComponets";
import { useEffect, useState } from "react";

export function useLodingSaleProducts() {
  const [soldProducts, setProducts] = useState<TableItem[]>([]);
  const { page, setPage, setTotalPages } = usePageStore();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]); // Formato 2026-02-15

  const handleDate = (date: string) => {
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
