export const formatCOP = (valor: number | string) => {
  const newValor = typeof valor === "string" ? parseFloat(valor) : valor;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
  }).format(newValor);
};

export const formatDate = (date: string) => {
  const newDate = new Date(date);
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(newDate);
};