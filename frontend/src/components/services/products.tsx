import { API_ENDPOINT } from "../constants/endpoint.js";
import { ProductForm, productSold } from "../types/product.js";

const PRODUCTS_ENDPOINT = API_ENDPOINT + "products";
const CATEGORY_ENDPOINT = API_ENDPOINT + "category";
const SOLDPRODUCTS_ENDPOINT = API_ENDPOINT + "soldProducts";

export async function getProduct(id: string) {
  const response = await fetch(PRODUCTS_ENDPOINT + "/" + id);
  const data = await response.json();
  return data.data;
}

export async function createProduct(product: ProductForm) {
  const response = await fetch(PRODUCTS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });
  const data = await response.json();
  return { success: data.success, product: data.data, message: data.message };
}

export async function updateProduct(product: ProductForm) {
  const response = await fetch(PRODUCTS_ENDPOINT + "/" + product.id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });
  const data = await response.json();
  return data.data;
}

export async function deleteProduct(id: string | number) {
  const response = await fetch(PRODUCTS_ENDPOINT + "/" + id, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  return data.data;
}

export async function soldProducts(productSales: any[]) {
  const response = await fetch(SOLDPRODUCTS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(productSales),
  });
  const data = await response.json();
  return data.data;
}

export async function getProducts(search: string, page: number = 1) {
  const response = await fetch(
    PRODUCTS_ENDPOINT + "?" + "search=" + search + "&page=" + page,
  );
  const data = await response.json();

  return data;
}

export async function getCategories() {
  const response = await fetch(CATEGORY_ENDPOINT);
  const data = await response.json();
  return data.data;
}

export async function createCategory(category: { name: string }) {
  const response = await fetch(CATEGORY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(category),
  });
  const data = await response.json();
  return { success: data.success, data: data.data, message: data.message };
}

export async function deleteCategory(id: string | number) {
  const response = await fetch(CATEGORY_ENDPOINT + "/" + id, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  return data.data;
}

export async function updateCategory(
  id: string | number,
  category: { name: string },
) {
  const response = await fetch(CATEGORY_ENDPOINT + "/" + id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(category),
  });
  const data = await response.json();
  return data.data;
}

export async function getSoldProducts(
  date: string,
  page: number,
  limit = 10,
): Promise<{
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  success: boolean;
  soldProduct: productSold[];
}> {
  const response = await fetch(
    `${SOLDPRODUCTS_ENDPOINT}?date=${date}&page=${page}&limit=${limit}`,
  );
  const data = await response.json();

  const result = data.data || {};

  return {
    soldProduct: result.soldProduct || [],
    totalItems: result.totalItems || 0,
    totalPages: result.totalPages || 0,
    page: result.page || 1,
    limit: result.limit || 10,
    success: data.success || false,
  };
}

export async function getTopProduct(limit: number) {
  const response = await fetch(`${API_ENDPOINT}getTopSold?limit=${limit}`);

  const data = await response.json();

  return data.data;
}
