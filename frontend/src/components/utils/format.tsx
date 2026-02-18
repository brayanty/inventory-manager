export const formatCOP = (valor: number | string) => {
  const newValor = typeof valor === "string" ? parseFloat(valor) : valor;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
  }).format(newValor);
};
