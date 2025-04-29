import { IconVoid } from "@/components/layout/ui/imgs";
import formatCOP from "@/components/utils/format";

import useProductsStore from "@/components/store/products";

import { useEffect } from "react";
import { useSearchStore, useCategoryStore } from "@/components/store/filters";
import useShoppingCartStore from "@/components/store/ShoppingCart";
import { useCategoryListStore } from "@/components/store/category";

const techProducts = [
  {
    id: "1",
    name: "Laptop Lenovo IdeaPad 5",
    quantity: 1,
    category: "Computadoras",
    entire: 20,
    price: 1850000,
    sales: 5,
  },
  {
    id: "2",
    name: "Auriculares Bluetooth Sony WH-1000XM5",
    quantity: 1,
    category: "Audio",
    entire: 15,
    price: 299000,
    sales: 8,
  },
  {
    id: "3",
    name: "Monitor LG UltraWide 34''",
    quantity: 1,
    category: "Periféricos",
    entire: 10,
    price: 450000,
    sales: 3,
  },
  {
    id: "4",
    name: "Smartphone Samsung Galaxy S23",
    quantity: 1,
    category: "Móviles",
    entire: 25,
    price: 3999000,
    sales: 12,
  },
  {
    id: "5",
    name: "Teclado Mecánico Logitech G Pro X",
    quantity: 1,
    category: "Periféricos",
    entire: 30,
    price: 129000,
    sales: 18,
  },
  {
    id: "5",
    name: "Teclado Mecánico Logitech G Pro X",
    quantity: 1,
    category: "Periféricos",
    entire: 30,
    price: 129000,
    sales: 18,
  },
  {
    id: "5",
    name: "Teclado Mecánico Logitech G Pro X",
    quantity: 1,
    category: "Periféricos",
    entire: 30,
    price: 129000,
    sales: 18,
  },
  {
    id: "5",
    name: "Teclado Mecánico Logitech G Pro X",
    quantity: 1,
    category: "Periféricos",
    entire: 30,
    price: 129000,
    sales: 18,
  },

  {
    id: "5",
    name: "Teclado Mecánico Logitech G Pro X",
    quantity: 1,
    category: "Periféricos",
    entire: 30,
    price: 129000,
    sales: 18,
  },
  {
    id: "5",
    name: "Teclado Mecánico Logitech G Pro X",
    quantity: 1,
    category: "Periféricos",
    entire: 30,
    price: 129000,
    sales: 18,
  },
  {
    id: "5",
    name: "Teclado Mecánico Logitech G Pro X",
    quantity: 1,
    category: "Periféricos",
    entire: 30,
    price: 129000,
    sales: 18,
  },
  {
    id: "5",
    name: "Teclado Mecánico Logitech G Pro X",
    quantity: 1,
    category: "Periféricos",
    entire: 30,
    price: 129000,
    sales: 18,
  },
  {
    id: "5",
    name: "Teclado Mecánico Logitech G Pro X",
    quantity: 1,
    category: "Periféricos",
    entire: 30,
    price: 129000,
    sales: 18,
  },

  {
    id: "5",
    name: "Teclado Mecánico Logitech G Pro X",
    quantity: 1,
    category: "Periféricos",
    entire: 30,
    price: 129000,
    sales: 18,
  },
];

function RenderProducts({ byPage }: { byPage: number }) {
  const { products, addProduct } = useProductsStore();
  const { addProductShopping } = useShoppingCartStore();
  const { setCategoryList } = useCategoryListStore();
  const { category } = useCategoryStore();
  const { search } = useSearchStore();

  const loadTechProducts = () => {
    techProducts.forEach((product) => addProduct(product));
  };

  useEffect(() => {
    const fakeCategories = [
      { category: "Todos" },
      { category: "Computadoras" },
      { category: "Periféricos" },
      { category: "Móviles" },
    ];
    setCategoryList(fakeCategories);
    loadTechProducts();
  }, []);

  useEffect(() => {
    loadTechProducts();
  }, []);

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

  return (
    <>
      {products.slice(0, byPage).map((product) => (
        <tr
          key={product.id}
          className="bg-gray-400 dark:bg-[#242832] border-b dark:border-gray-700 border-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 cursor-pointer"
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
