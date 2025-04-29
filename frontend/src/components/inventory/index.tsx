import { useState } from "react";
import RenderProducts from "./components/renderProducts";
import Paginator from "../layout/ui/Paginator";

function Product() {
  const totalItems = 50;
  const [sortBy, setSortBy] = useState("name");
  const [orderAsc, setOrderAsc] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [byPage, setByPage] = useState(10);
  const totalPages = Math.ceil(totalItems / byPage);

  const handlerSort = (campo: string) => {
    if (sortBy === campo) {
      setOrderAsc(!orderAsc);
    } else {
      setSortBy(campo);
      setOrderAsc(true);
    }
    setPagina(1);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Contenido scrollable */}
      <div className="flex-1 ">
        <table className="overflow-y-auto overflow-x-auto no-scrollbar h-full min-w-full text-sm text-left text-gray-400 dark:text-gray-300">
          <thead className="sticky top-0 z-10 text-xs text-gray-700 uppercase bg-gray-400 dark:bg-[rgb(62,67,80)] dark:text-gray-300">
            <tr>
              <th
                onClick={() => handlerSort("name")}
                className="px-4 py-2 cursor-pointer whitespace-nowrap"
              >
                Producto {sortBy === "name" ? (orderAsc ? "↑" : "↓") : ""}
              </th>
              <th
                onClick={() => handlerSort("category")}
                className="px-4 py-2 cursor-pointer whitespace-nowrap"
              >
                Categoría {sortBy === "category" ? (orderAsc ? "↑" : "↓") : ""}
              </th>
              <th
                onClick={() => handlerSort("sales")}
                className="px-4 py-2 cursor-pointer whitespace-nowrap"
              >
                Vendidos {sortBy === "sales" ? (orderAsc ? "↑" : "↓") : ""}
              </th>
              <th
                onClick={() => handlerSort("entire")}
                className="px-4 py-2 cursor-pointer whitespace-nowrap"
              >
                Total {sortBy === "entire" ? (orderAsc ? "↑" : "↓") : ""}
              </th>
              <th
                onClick={() => handlerSort("price")}
                className="px-4 py-2 cursor-pointer whitespace-nowrap"
              >
                Precio {sortBy === "price" ? (orderAsc ? "↑" : "↓") : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            <RenderProducts byPage={byPage} />
          </tbody>
        </table>
      </div>

      {/* Paginador visible abajo */}
      <div className="bg-white dark:bg-gray-800 shadow-md p-3 border-t dark:border-gray-700">
        <Paginator
          currentPage={pagina}
          totalPages={totalPages}
          onPageChange={setPagina}
        />
      </div>
    </div>
  );
}

export default Product;
