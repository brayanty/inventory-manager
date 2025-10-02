const DEVICE_ENDPOINT = "http://localhost:3000/products";

export async function getProduct(id: string) {
  const response = await fetch(DEVICE_ENDPOINT + "/" + id);
  const data = await response.json();
  return data;
}

export async function createProduct(product) {
  const response = await fetch(DEVICE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });
  const data = await response.json();
  return data;
}

export async function updateProduct(id, product) {
  const response = await fetch(DEVICE_ENDPOINT + "/" + id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });
  const data = await response.json();
  return data;
}

export async function deleteProduct(id) {
  const response = await fetch(DEVICE_ENDPOINT + "/" + id, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  return data;
}

export async function soldProducts(productSales) {
  const response = await fetch(DEVICE_ENDPOINT + "/" + "sold", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(productSales),
  });
  const data = await response.json();
  return data;
}

export async function getProducts(search: string, page: number = 1) {
  const response = await fetch(
    DEVICE_ENDPOINT + "?" + "search=" + search + "&page=" + page
  );
  const data = await response.json();
  return data;
}

export async function getCategories() {
  const response = await fetch(DEVICE_ENDPOINT + "/categories");
  const data = await response.json();
  return data;
}

export async function createCategory(category) {
  const response = await fetch(DEVICE_ENDPOINT + "/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(category),
  });
  const data = await response.json();
  return data;
}

export async function deleteCategory(id) {
  const response = await fetch(DEVICE_ENDPOINT + "/categories/" + id, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  return data;
}

export async function updateCategory(id, category) {
  const response = await fetch(DEVICE_ENDPOINT + "/categories/" + id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(category),
  });
  const data = await response.json();
  return data;
}
