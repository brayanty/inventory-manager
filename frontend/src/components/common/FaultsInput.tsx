import React, { useState, KeyboardEvent, ChangeEvent, useEffect } from "react";
import { Product } from "../types/product";

interface FaultsInputProps {
  value: string[];
  onChange?: (e: { target: { name: string; value: string[] } }) => void;
}

const FaultsInput: React.FC<FaultsInputProps> = ({ value, onChange }) => {
  const [inputValue, setInputValue] = useState("");
  const [replacement, setReplacement] = useState<Product[]>([]);

  useEffect(() => {
    const fetchTypingFaults = async () => {
      if (inputValue.trim().length < 2) {
        setReplacement([]);
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:3000/repairTypeAvailable/?search=${inputValue}`
        );
        const data = await response.json();

        setReplacement(data);
      } catch (error) {
        console.error("Error fetching repair types:", error);
      }
    };

    const timeout = setTimeout(fetchTypingFaults, 1000); // pequeño debounce
    return () => clearTimeout(timeout);
  }, [inputValue]);

  const addFault = (newFault: string) => {
    const trimmed = newFault.trim();
    if (trimmed && !value.includes(trimmed)) {
      const updated = [...value, trimmed];
      onChange?.({ target: { name: "faults", value: updated } });
    }
  };

  const removeFault = (index: number) => {
    const updated = value.filter((_, i) => i !== index);
    onChange?.({ target: { name: "faults", value: updated } });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
      e.preventDefault();
      addFault(inputValue);
      setInputValue("");
      setReplacement([]);
    }

    if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeFault(value.length - 1);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="border border-gray-950 rounded-md p-2 flex flex-wrap gap-2 min-w-full items-center relative">
      {value.map((fault, index) => (
        <span
          key={index}
          className="capitalize flex items-center bg-blue-500 text-white text-sm px-3 py-1 rounded-full"
        >
          {fault}
          <button
            onClick={() => removeFault(index)}
            className="ml-2 focus:outline-none hover:text-red-300"
            type="button"
          >
            ×
          </button>
        </span>
      ))}

      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Escribe una falla y presiona Enter"
        className="flex-grow min-w-[150px] outline-none bg-transparent text-sm"
      />

      {replacement.length > 0 && (
        <ul className="absolute top-10 left-0 w-full h-[100px] bg-white border border-gray-300 rounded-md mt-1 max-h-100 overflow-y-auto z-10 shadow-lg">
          {replacement.map((r) => (
            <li
              key={r.id}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
              onClick={() => {
                addFault(r.name);
                setInputValue("");
                setReplacement([]);
              }}
            >
              {r.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FaultsInput;
