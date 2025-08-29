import FormRender from "@/components/common/formProduct";
import RenderProducts from "@/components/inventory/components/renderProducts";
import Paginator from "@/components/layout/ui/Paginator";
import { createProduct } from "@/components/services/products";
import usePage from "@/components/store/page.tsx";
import { useState } from "react";
import { toast } from "react-toastify";

function ProductsInventory() {
  const { page, setPage } = usePage();
  const [isOpenAddProduct, setOpenAddProduct] = useState(false);

  const handleSubmit = async (data: Record<string, []>) => {
    const response = await createProduct(data);
    if (response) {
      {
        setOpenAddProduct(false);
        toast.success("Producto agregado correctamente");
      }
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex justify-between p-3 items-center">
        <h2 className="text-xl font-bold mb-4">Inventario de Productos</h2>
        <button
          type="button"
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
          onClick={() => {
            setOpenAddProduct(true);
          }}
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
      <Paginator selectPage={page} onPageChange={setPage} />
      <FormRender
        isForm={isOpenAddProduct}
        closeForm={() => setOpenAddProduct(false)}
        onSubmit={(data) => handleSubmit(data)}
        fields={[
          {
            label: "Producto",
            name: "name",
            type: "text",
            placeholder: "Petrolino Sinforoso",
          },
          {
            label: "Categoria",
            name: "category",
            type: "text",
            placeholder: "Iphone 14",
          },
          { label: "Total", name: "total", type: "number" },
          {
            label: "Precio",
            name: "price",
            type: "price",
            placeholder: "40.000",
          },
        ]}
      />
    </div>
  );
}

export default ProductsInventory;
