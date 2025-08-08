//esta funcion convierte un string de precio en formato latinoamericano a un numero flotante
export const parseLAPrice = (value: string): number => {
   return parseFloat(value.replace(/[$.]/g, "").replace(",", "."));
}
