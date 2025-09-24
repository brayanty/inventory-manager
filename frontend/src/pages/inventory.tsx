import FormRender from "@/components/common/formProduct";
import RenderProducts from "@/components/inventory/components/renderProducts";
import Paginator from "@/components/layout/ui/Paginator";
import { createCategory, createProduct } from "@/components/services/products";
import usePage from "@/components/store/page.tsx";
import useProductsStore from "@/components/store/products";
import { useState } from "react";
import { toast } from "react-toastify";
import { useCategoryListStore } from "@/components/store/category";
import Button from "@/components/common/button";

function ProductsInventory() {
  const { page, setPage } = usePage();
  const [isOpenAddProduct, setOpenAddProduct] = useState(false);
  const { products, addProducts } = useProductsStore();
  const { categoryList, setCategoryList } = useCategoryListStore();

  const [isOpenAddCategory, setOpenAddCategory] = useState(false);

  const handleSubmitCategory = async (data: Record<string, []>) => {
    const newCategory = await createCategory(data);
    const newCategories = [...categoryList, newCategory];
    setCategoryList(newCategories);
    toast.success("Categoría agregada correctamente");
    setOpenAddCategory(false);
  };

  const handleSubmit = async (data: Record<string, []>) => {
    const newProduct = await createProduct(data);
    const newProducts = [...products, newProduct];
    if (newProduct) {
      {
        setOpenAddProduct(false);
        addProducts(newProducts);

        toast.success("Producto agregado correctamente");
      }
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex justify-between p-3 items-center">
        <h2 className="text-xl font-bold mb-4">Inventario de Productos</h2>
        <div className="flex gap-2">
          <Button
            className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
            onClick={() => {
              setOpenAddProduct(true);
            }}
          >
            Agregar Producto
          </Button>
          <Button
            className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 transition"
            onClick={() => {
              setOpenAddCategory(true);
            }}
          >
            Agregar Categoria
          </Button>
        </div>
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
      {/* Formulario para agregar categoria */}
      <FormRender
        title="Agregar Categoría"
        isForm={isOpenAddCategory}
        closeForm={() => setOpenAddCategory(false)}
        onSubmit={(data) => handleSubmitCategory(data)}
        fields={[
          {
            label: "Categoría",
            name: "category",
            type: "text",
            placeholder: "Perifericos...",
          },
        ]}
      />
      {/* Formulario para agregar productos */}
      <FormRender
        title="Formulario para agregar productos"
        isForm={isOpenAddProduct}
        closeForm={() => setOpenAddProduct(false)}
        onSubmit={(data) => handleSubmit(data)}
        fields={[
          {
            label: "Producto",
            name: "name",
            type: "text",
            placeholder: "Audifonos KJS 34",
          },
          {
            label: "Categoria",
            name: "category",
            type: "select",
            items: categoryList,
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
