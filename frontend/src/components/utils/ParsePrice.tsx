export const parseLAPrice = (value: string): number => {
   return parseFloat(value.replace(/[$.]/g, "").replace(",", "."));
}
