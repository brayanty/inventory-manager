import { IconVoid } from "@/components/layout/ui/imgs";
import { formatCOP } from "@/components/utils/format";

import useProductsStore from "@/components/store/products";

import { useEffect, useState } from "react";
import { useSearchStore } from "@/components/store/filters";
import useShoppingCartStore from "@/components/store/ShoppingCart";
import { useCategoryListStore } from "@/components/store/category";
import { getCategories, getProducts } from "@/components/services/products";
import usePage from "@/components/store/page";
import { useHandleController } from "../hooks/useHandleController";
import { Product } from "@/components/types/product";

function RenderProducts() {
  const { products, addProducts } = useProductsStore();
  const { productsCart, addProductShopping } = useShoppingCartStore();
  const { handleAddShoppingCart } = useHandleController(
    productsCart,
    addProductShopping
  );
  const { categorySelect, setCategoryList } = useCategoryListStore();
  const { search } = useSearchStore();
  const { page, setPage } = usePage();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading((prev) => !prev);
  }, [page, setPage]);

  useEffect(() => {
    const loadCategories = async () => {
      const categories = await getCategories();
      setCategoryList(categories);
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      const response = await getProducts(search, page);
      addProducts(response.data || []);
    };
    loadProducts();
    setIsLoading(false);
  }, [search, page, setPage]);

  const filtered = products.filter((product) => {
    if (
      product.name === undefined ||
      product.id === undefined ||
      product.price === undefined ||
      product.total === undefined ||
      product.sales === undefined
    ) {
      return false;
    }

    const matchName = product.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categorySelect === "all" || product.category.english === categorySelect;
    return matchName && matchCategory;
  });

  if (filtered.length === 0 || !products) {
    return (
      <tr>
        <td colSpan={6} className="text-center py-6">
          <IconVoid className="mx-auto w-100 h-40" />
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            No hay productos.
          </p>
        </td>
      </tr>
    );
  }

  if (filtered.length <= 0) {
    return <tr className="col-span-full">No hay productos </tr>;
  }
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

  return (
    <>
      {filtered.map((product: Product) => (
        <tr
          key={product.id}
          className="border-b dark:border-gray-700 border-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 cursor-pointer"
          onClick={() => handleAddShoppingCart(product)}
        >
          <th
            scope="row"
            className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
          >
            {product.name}
          </th>
          <td className="px-6 py-4">{product.category.spanich}</td>
          <td className="px-6 py-4">{product.sales}</td>
          <td className="px-6 py-4">{product.total}</td>
          <td className="px-6 py-4">{formatCOP(product.price)}</td>
        </tr>
      ))}
    </>
  );
}

export default RenderProducts;
