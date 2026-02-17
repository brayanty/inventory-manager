export type ID = string;

/**
 * Campos comunes para productos
 */
export interface ProductBase {
  /** Identificador único */
  id: ID;
  /** Nombre del producto */
  name: string;
  /** Categoría del producto */
  category: string;
  /** Precio unitario */
  price: string;
  /** Ventas acumuladas (unidades) */
  sales: number;
  /** stock monetario (price * quantity) — puede calcularse en runtime */
  stock: number;
}

export type ProductForm = Omit<ProductBase, "sales">;

/** Producto estándar */
export type Product = ProductBase;

/** Producto en el carrito: incluye la cantidad seleccionada */
export interface ProductCart extends ProductBase {
  stock: number;
}

/** Mantiene compatibilidad con el nombre anterior */
export type ProductsCart = ProductCart & { maxStock: number };

/** Lista simple de categorías */
export type CategoryList = {
  category: string;
};
