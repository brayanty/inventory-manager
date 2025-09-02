import { IconVoid } from "@/components/layout/ui/imgs";
import { formatCOP } from "@/components/utils/format";

import useProductsStore from "@/components/store/products";

import { useEffect, useState } from "react";
import { useSearchStore, useCategoryStore } from "@/components/store/filters";
import useShoppingCartStore from "@/components/store/ShoppingCart";
import { useCategoryListStore } from "@/components/store/category";
import { getProducts } from "@/components/services/products";
import usePage from "@/components/store/page";
import { toast } from "react-toastify";

function RenderProducts() {
  const { products, addProducts } = useProductsStore();
  const { productsCart, addProductShopping } = useShoppingCartStore();
  const { setCategoryList } = useCategoryListStore();
  const { category } = useCategoryStore();
  const { search } = useSearchStore();
  const { page, setPage } = usePage();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading((prev) => !prev);
  }, [page, setPage]);

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
      const response = await getProducts(search, page);
      addProducts(response.data || []);
    };
    loadProducts();
    setIsLoading(false);
  }, [search, page, setPage]);

  const handleAddShoppingCart = (product) => {
    const indexSearch = productsCart.findIndex(
      (productCart) => productCart.id === product.id
    );

    if (indexSearch === -1) {
      addProductShopping(product);
      toast.success("Se agrego correctamente al carrito");
      return;
    } else {
      toast.warn("Ya existe en el carrito");
    }
  };

  const filtered = products.filter((product) => {
    const matchName = product.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "" || product.category === category;
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

  if (products.length <= 0) {
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
      {products.map((product) => (
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
          <td className="px-6 py-4">{product.category}</td>
          <td className="px-6 py-4">{product.sales}</td>
          <td className="px-6 py-4">{product.total}</td>
          <td className="px-6 py-4">{formatCOP(product.price)}</td>
        </tr>
      ))}
    </>
  );
}

export default RenderProducts;
