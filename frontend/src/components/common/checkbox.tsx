import { ChangeEvent } from "react";

interface Checkbox {
  ID: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}
function Checkbox({ ID, checked, onChange }: Checkbox) {
  return (
    <div>
      <label className="text-white" htmlFor={ID}>
        <input
          id={ID}
          type="checkbox"
          checked={checked}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.checked)
          }
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
        />
      </label>
    </div>
  );
}

export default Checkbox;
