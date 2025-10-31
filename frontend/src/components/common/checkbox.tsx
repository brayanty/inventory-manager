import { ChangeEvent } from "react";

interface Checkbox {
  title?: string;
  ID: string;
  checked: boolean;
  onChange: (checked: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}
function Checkbox({ title, ID, checked, onChange, className }: Checkbox) {
  return (
    <label
      className={`flex justify-center items-center gap-2 text-black cursor-pointer select-none ${className}`}
      htmlFor={ID}
    >
      <input
        id={ID}
        type="checkbox"
        checked={checked}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e)}
        className="checkbox checkbox-info"
      />

      {title}
    </label>
  );
}

export default Checkbox;
