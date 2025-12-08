export const formatCOP = (valor: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
  }).format(valor);
