import { NumericFormat }from "react-number-format";

export const formatCOP = (valor: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
  }).format(valor);



export  const PriceInput = ({ value, onChange }: {value: number,onChange: (value: number)=> void}) => {
  return (
    <label className="input input-bordered flex items-center gap-2 w-full max-w-xs">
      $
      <NumericFormat
        value={value}
        thousandSeparator="."
        decimalSeparator=","
        decimalScale={2}
        fixedDecimalScale
        allowNegative={false}
        onValueChange={(values) => onChange(values.floatValue || 0)}
        className="grow bg-transparent outline-none"
        placeholder="Precio"
      />
    </label>
  );
};