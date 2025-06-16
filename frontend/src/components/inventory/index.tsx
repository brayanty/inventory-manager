import { useState } from "react";
import RenderProducts from "./components/renderProducts";
import Paginator from "../layout/ui/Paginator";

function Product() {
  const [pagina, setPagina] = useState(1);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex justify-between p-3 items-center">
        <h2 className="text-xl font-bold mb-4">Inventaio de Productos</h2>
        <button
          type="button"
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Agregar Producto
        </button>
      </div>
      <div className="overflow-x-auto overflow-y-auto min-h-[60vh] max-h-[50vh]">
        <table className="w-full text-sm text-left text-gray-300 border-collapse">
          <thead className="sticky top-0 z-10 text-xs text-gray-700 uppercase bg-gray-400 dark:bg-[rgb(62,67,80)] dark:text-gray-300">
            <tr>
              <th className="px-4 py-2 cursor-pointer whitespace-nowrap">
                Producto
              </th>
              <th className="px-4 py-2 cursor-pointer whitespace-nowrap">
                Categoría
              </th>
              <th className="px-4 py-2 cursor-pointer whitespace-nowrap">
                Vendidos
              </th>
              <th className="px-4 py-2 cursor-pointer whitespace-nowrap">
                Total
              </th>
              <th className="px-4 py-2 cursor-pointer whitespace-nowrap">
                Precio
              </th>
            </tr>
          </thead>
          <tbody>
            <RenderProducts />
          </tbody>
        </table>
      </div>
      <Paginator selectPage={pagina} onPageChange={setPagina} />
    </div>
  );
}

export default Product;
