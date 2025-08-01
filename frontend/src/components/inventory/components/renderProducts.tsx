import { IconVoid } from "@/components/layout/ui/imgs";
import {formatCOP} from "@/components/utils/format";

import useProductsStore from "@/components/store/products";

import { useEffect } from "react";
import { useSearchStore, useCategoryStore } from "@/components/store/filters";
import useShoppingCartStore from "@/components/store/ShoppingCart";
import { useCategoryListStore } from "@/components/store/category";
import { searchProcuct } from "@/components/services/products";

function RenderProducts() {
  const { products, addProducts } = useProductsStore();
  const { addProductShopping } = useShoppingCartStore();
  const { setCategoryList } = useCategoryListStore();
  const { category } = useCategoryStore();
  const { search } = useSearchStore();

  useEffect(() => {
    const fakeCategories = [
      { category: "Todos" },
      { category: "Computadoras" },
      { category: "Periféricos" },
      { category: "Móviles" },
    ];
    setCategoryList(fakeCategories);
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      const response = await searchProcuct(search);
      addProducts(response);
    };
    loadProducts();

    console.log(products);
  }, [search]);

  const filtered = products.filter((product) => {
    const matchName = product.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "" || product.category === category;
    return matchName && matchCategory;
  });

  if (filtered.length === 0) {
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

  if (products.length <= 0) {
    return <tr className="col-span-full">No hay productos </tr>;
  }

  return (
    <>
      {products.map((product) => (
        <tr
          key={product.id}
          className="border-b dark:border-gray-700 border-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 cursor-pointer"
          onClick={() => addProductShopping(product)}
        >
          <th
            scope="row"
            className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
          >
            {product.name}
          </th>
          <td className="px-6 py-4">{product.category}</td>
          <td className="px-6 py-4">{product.sales}</td>
          <td className="px-6 py-4">{product.entire}</td>
          <td className="px-6 py-4">{formatCOP(product.price)}</td>
        </tr>
      ))}
    </>
  );
}

export default RenderProducts;
