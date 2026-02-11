import FormRender from "@/components/common/formProduct";
import RenderProducts from "@/components/inventory/components/renderProducts";
import Paginator from "@/components/common/paginator";
import {
  createCategory,
  createProduct,
  updateProduct,
} from "@/components/services/products";
import useProductsStore from "@/components/store/products";
import { useState } from "react";
import { toast } from "react-toastify";
import { useCategoryListStore } from "@/components/store/category";
import Button from "@/components/common/button";
import { ProductBase, ProductForm } from "@/components/types/product";
import { TableTitleHead } from "@/components/common/tableComponets";
import { INVENTORY_TABLE_HEADERS } from "@/components/constants/inventory.const";

function ProductsInventory() {
  const [isOpenAddProduct, setOpenAddProduct] = useState(false);
  const [editFormProduct, setEditFormProduct] = useState<ProductForm>();
  const [isFormEdit, setIsFormEdit] = useState(false);
  const { products, addProducts } = useProductsStore();
  const { categoryList, setCategoryList } = useCategoryListStore();

  const [isOpenAddCategory, setOpenAddCategory] = useState(false);

  const handlerEditableProduct = (product: ProductBase) => {
    setIsFormEdit(true);
    setEditFormProduct(product);
    setOpenAddProduct(true);
  };

  const handleSubmitCategory = async (data: Record<string, []>) => {
    const newCategory = await createCategory(data);
    const newCategories = [...categoryList, newCategory];
    setCategoryList(newCategories);
    toast.success("Categoría agregada correctamente");
    setOpenAddCategory(false);
  };

  const handleSubmit = async (data: ProductForm & { id?: string }) => {
    if (!data) return;
    try {
      const newProduct = isFormEdit
        ? await updateProduct(data.id, data)
        : await createProduct(data);

      if (!newProduct) {
        toast.error("No se pudo procesar el producto.");
        return;
      }

      if (isFormEdit) {
        toast.success("Producto actualizado correctamente");
        setIsFormEdit(false);
        addProducts([
          ...products.filter((p) => p.id !== newProduct.id),
          newProduct,
        ]);
      } else {
        addProducts([...products, newProduct]);
        toast.success("Producto agregado correctamente");
      }

      setOpenAddProduct(false);
      setEditFormProduct({
        id: "",
        name: "",
        category: "",
        price: 0,
        sales: 0,
      });
    } catch (error) {
      console.error(error);
      toast.error("Error al procesar el producto.");
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex justify-between p-3 items-center">
        <h2 className="text-xl max-md:text-[1em] font-bold mb-4">
          Inventario de Productos
        </h2>
        <div className="flex gap-2">
          <Button
            className="bg-blue-600 text-[.8em] px-4 py-2 rounded hover:bg-blue-700 transition"
            onClick={() => {
              setOpenAddProduct(true);
            }}
          >
            Agregar Producto
          </Button>
          <Button
            className="bg-green-600 text-[.8em] px-4 py-2 rounded hover:bg-green-700 transition"
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
              <TableTitleHead itemsTitle={INVENTORY_TABLE_HEADERS} />
            </tr>
          </thead>
          <tbody>
            <RenderProducts handlerEditableProduct={handlerEditableProduct} />
          </tbody>
        </table>
      </div>
      <Paginator />
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
        title={
          isFormEdit
            ? "Formulario para editar producto"
            : "Formulario para agregar productos"
        }
        isForm={isOpenAddProduct}
        closeForm={() => {
          setOpenAddProduct(false);
          setIsFormEdit(false);
          setEditFormProduct({
            id: "",
            name: "",
            category: "",
            price: 0,
            sales: 0,
          });
        }}
        dataEdit={editFormProduct}
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
