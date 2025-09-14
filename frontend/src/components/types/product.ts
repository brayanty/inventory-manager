export type Product = {
  name: string;
  quantity: number;
  category: string;
  total?: number;
  price: number;
  sales: number;
  id?: string;
};

export type ProductsCart = {
  name: string;
  quantity: number;
  category: string;
  total?: number;
  price: number;
  sales: number;
  id?: string;
  amount?: number;
};

export type CategoryList = {
  category: { spanich: string; english: string };
};
