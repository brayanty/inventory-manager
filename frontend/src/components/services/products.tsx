const DEVICE_ENDPOINT = "http://localhost:3000/products";

export async function getProduct(id: string) {
  const response = await fetch(DEVICE_ENDPOINT + "/" + id);
  const data = await response.json();
  return data;
}
export async function createProduct(device) {
  const response = await fetch(DEVICE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(device),
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
export async function getProducts(search: string) {
  const response = await fetch(DEVICE_ENDPOINT + "?" + "search=" + search);
  const data = await response.json();
  return data;
}
