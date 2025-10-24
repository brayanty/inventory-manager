import { IconVoid } from "@/components/layout/ui/imgs";
import { formatCOP } from "@/components/utils/format";

import useProductsStore from "@/components/store/products";

import { useEffect, useState } from "react";
import { useSearchStore } from "@/components/store/filters";
import { useCategoryListStore } from "@/components/store/category";
import {
  deleteProduct,
  getCategories,
  getProducts,
} from "@/components/services/products";
import usePage from "@/components/store/page";
import { useHandleController } from "../hooks/useHandleController";
import { Product } from "@/components/types/product";
import { toast } from "react-toastify";
import { DropDown } from "@/components/common/dropdown";

function RenderProducts({
  handlerEditableProduct,
}: {
  handlerEditableProduct: (product: Product) => void;
}) {
  const { products, addProducts } = useProductsStore();
  const { setShoppingCart } = useHandleController();

  const { categorySelect, setCategoryList } = useCategoryListStore();
  const { search } = useSearchStore();
  const { page, setTotalPages } = usePage();
  const [isLoading, setIsLoading] = useState(true);
  const opcion = ["Detalles", "Editar", "Eliminar", "Agregar al carrito"];

  // Cargar categorías al inicio
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categories = await getCategories();
        setCategoryList(categories);
      } catch (error) {
        toast.error("Error cargando categorías:");
        throw new Error("Error cargando categorías\n" + error);
      }
    };
    loadCategories();
  }, [setCategoryList]);

  // Cargar productos cuando cambie search o page
  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      try {
        const response = await getProducts(search, page);
        setTotalPages(response.data.totalPages);
        addProducts(response.data.products);
      } catch (error) {
        toast.error("Error cargando productos:");
        throw new Error("Error cargando productos\n" + error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProducts();
  }, [search, page, addProducts]);

  const handleDeleteProduct = (id: string) => {
    const updatedProducts = products.filter((product) => product.id !== id);
    deleteProduct(id);
    addProducts(updatedProducts);
  };

  const handleOpcionProduct = (option: string, product: Product) => {
    if (
      option === "Eliminar" &&
      confirm("¿Estás seguro de que deseas eliminar este producto?")
    ) {
      handleDeleteProduct(product.id);
      toast.success("Producto eliminado correctamente");
      return;
    }
    if (option === "Detalles") {
      console.log(product.id);
      return;
    }
    if (option === "Editar") {
      handlerEditableProduct(product);
      return;
    }
    if (option === "Agregar al carrito" && confirm("¿Agregar al carrito?")) {
      setShoppingCart(product);
    }
  };

  const filteredProducts = products.filter((product) => {
    if (categorySelect === "todos") return true;
    const matchName = product.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = product.category === categorySelect;
    return matchName && matchCategory;
  });

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <tr>
        <td colSpan={6} className="text-center py-6">
          <p className="text-gray-500 dark:text-gray-400">
            Cargando productos...
          </p>
        </td>
      </tr>
    );
  }

  // Mostrar vacío
  if (filteredProducts.length === 0) {
    return (
      <tr>
        <td colSpan={6} className="text-center py-6">
          <IconVoid className="mx-auto w-20 h-20" />
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            No hay productos.
          </p>
        </td>
      </tr>
    );
  }

  // Render normal
  return (
    <>
      {filteredProducts.map((product: Product) => (
        <tr
          key={product.id}
          className="border-b dark:border-gray-700 border-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 cursor-pointer"
        >
          <th
            scope="row"
            className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
          >
            {product.name}
          </th>
          <td className="px-6 py-4">{product.category}</td>
          <td className="px-6 py-4">{product.sales}</td>
          <td className="px-6 py-4">{product.total}</td>
          <td className="px-6 py-4">{formatCOP(product.price)}</td>
          <td className="px-6 py-4">
            <DropDown
              items={opcion}
              onSelect={(option) => handleOpcionProduct(option, product)}
            />
            {}
          </td>
        </tr>
      ))}
    </>
  );
}

export default RenderProducts;
