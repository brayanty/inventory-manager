import { API_ENDPOINT } from "../constants/endpoint.js";
import { productSold } from "../types/product.js";

const PRODUCTS_ENDPOINT = API_ENDPOINT + "products";
const CATEGORY_ENDPOINT = API_ENDPOINT + "category";
const SOLDPRODUCTS_ENDPOINT = API_ENDPOINT + "soldProducts";

export async function getProduct(id: string) {
  const response = await fetch(PRODUCTS_ENDPOINT + "/" + id);
  const data = await response.json();
  return data.data;
}

export async function createProduct(product) {
  const response = await fetch(PRODUCTS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });
  const data = await response.json();
  return data.data;
}

export async function updateProduct(id, product) {
  const response = await fetch(PRODUCTS_ENDPOINT + "/" + id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });
  const data = await response.json();
  return data.data;
}

export async function deleteProduct(id) {
  const response = await fetch(PRODUCTS_ENDPOINT + "/" + id, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  return data.data;
}

export async function soldProducts(productSales) {
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

export async function createCategory(category) {
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

export async function deleteCategory(id) {
  const response = await fetch(CATEGORY_ENDPOINT + "/" + id, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  return data.data;
}

export async function updateCategory(id, category) {
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
