import FormRender from "@/components/common/formProduct";
import RenderProducts from "@/components/inventory/components/renderProducts";
import Paginator from "@/components/common/paginator";
import {
  createCategory,
  createProduct,
  updateProduct,
} from "@/components/services/products";
import { useState } from "react";
import { toast } from "react-toastify";
import { useCategoryListStore } from "@/components/store/category";
import Button from "@/components/common/button";
import { ProductBase, ProductForm } from "@/components/types/product";
import { TableTitleHead } from "@/components/common/tableComponets";
import { INVENTORY_TABLE_HEADERS } from "@/components/constants/inventory.const";
import ShoppingCart from "@/components/common/shoppingCart";
import { ShoppingCartIcon, X } from "lucide-react";

function ProductsInventory() {
  const [isOpenAddProduct, setOpenAddProduct] = useState(false);
  const [editFormProduct, setEditFormProduct] = useState<ProductForm>();
  const [isFormEdit, setIsFormEdit] = useState(false);
  const { categoryList, setCategoryList } = useCategoryListStore();

  const [isOpenAddCategory, setOpenAddCategory] = useState(false);
  const [isOpenShoppingCart, setOpenShoppingCart] = useState(false);

  const handlerEditableProduct = (product: ProductBase) => {
    setIsFormEdit(true);
    setEditFormProduct(product);
    setOpenAddProduct(true);
  };

  const handleSubmitCategory = async (name: string) => {
    const newCategory = await createCategory({ name });

    if (!newCategory.success) {
      toast.error(newCategory.message || "No se pudo agregar la categoría.");
      console.error(newCategory.message);
      return;
    }
    const newCategories = [...categoryList, newCategory.data];
    setCategoryList(newCategories);
    toast.success("Categoría agregada correctamente");
    setOpenAddCategory(false);
  };
  const handleCreateProduct = async (formProduct: ProductForm) => {
    const { success, message } = await createProduct(formProduct);
    if (!success) {
      Error(message || "No puedo establecer conexión con la base de datos");
    }
    toast.success(message);
  };

  const handleUpdateProduct = async (formProduct: ProductForm) => {
    const { success, message } = await updateProduct(formProduct);
    if (!success) {
      Error(message || "No puedo establecer conexión con la base de datos");
    }
    toast.success(message);
  };

  return (
    <div className="md:grid grid-cols-3 grid-rows-5 gap-4">
      <div className="col-span-2 row-span-5">
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
          onSubmit={(data) => handleSubmitCategory(data.name)}
          fields={[
            {
              label: "Categoría",
              name: "name",
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
              price: "0",
              stock: 0,
            });
          }}
          dataEdit={editFormProduct}
          onSubmit={(data) =>
            isFormEdit ? handleUpdateProduct(data) : handleCreateProduct(data)
          }
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
            { label: "Stock", name: "stock", type: "numeric" },
            {
              label: "Precio",
              name: "price",
              type: "price",
              placeholder: "40.000",
            },
          ]}
        />
      </div>
      <div
        id="shopping-cart"
        className={`${isOpenShoppingCart ? "" : "max-md:opacity-0 max-md:pointer-events-none"}  h-full w-full row-span-5 col-start-3`}
      >
        <button
          title="Boton de cerrar"
          onClick={() => {
            setOpenShoppingCart((prev) => !prev);
          }}
          className="hover:bg-gray-500/20 p-4 z-100 fixed top-3 right-5 rounded-full md:invisible"
        >
          <X />
        </button>
        <ShoppingCart />
      </div>
      <div className="relative h-full w-full">
        {/* Mobile floating button */}
        <button
          title="Boton para abrir el carrito de compras"
          onClick={() => {
            setOpenShoppingCart((prev) => !prev);
          }}
          className="md:invisible visible fixed bottom-4 right-4 z-30 bg-green-600 p-3 rounded-full shadow-lg"
        >
          <ShoppingCartIcon className="text-white w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default ProductsInventory;
