import React, { useState, KeyboardEvent, ChangeEvent, useEffect } from "react";
import { Product } from "../types/product";
import { useDeviceFormStore } from "../store/useDeviceFormStore";
import { API_ENDPOINT } from "../constants/endpoint.tsx";
import { toast } from "react-toastify";
import { X } from "lucide-react";

interface FaultsInputProps {
  onChange?: (e: { target: { name: string; value: Product[] } }) => void;
}

const FaultsInput: React.FC<FaultsInputProps> = ({ onChange }) => {
  const [inputValue, setInputValue] = useState("");
  const [replacement, setReplacement] = useState<Product[]>([]);
  const { deviceForm, setPriceForm, setDeviceForm } = useDeviceFormStore();

  useEffect(() => {
    if (inputValue.trim().length < 2) {
      setReplacement([]);
      return;
    }

    const fetchTypingFaults = async () => {
      try {
        const response = await fetch(
          `${API_ENDPOINT}repairs/?search=${inputValue}`
        );
        const data = await response.json();

        if (data.status === 404) {
          setReplacement([]);
          toast.error("No se encontraron tipos de reparación o productos.");
          return;
        }

        setReplacement(data.data);
      } catch (error) {
        console.error("Error fetching repair types:", error);
      }
    };

    const timeout = setTimeout(fetchTypingFaults, 500);
    return () => clearTimeout(timeout);
  }, [inputValue]);

  const recalcPrice = (faults: Product[]) => {
    const total = faults.reduce((acc, f) => acc + (f.price || 0), 0);
    setPriceForm(total);
  };

  const addFault = (newFault: Product) => {
    const alreadyExists = deviceForm.faults.some((f) => f.id === newFault.id);
    if (alreadyExists) return;

    const updatedFaults = [...deviceForm.faults, newFault];
    onChange?.({ target: { name: "faults", value: updatedFaults } });
    setDeviceForm("faults", updatedFaults);
    recalcPrice(updatedFaults);

    setInputValue("");
    setReplacement([]);
  };

  const removeFault = (index: number) => {
    const updatedFaults = deviceForm.faults.filter((_, i) => i !== index);
    onChange?.({ target: { name: "faults", value: updatedFaults } });
    setDeviceForm("faults", updatedFaults);
    recalcPrice(updatedFaults);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
      e.preventDefault();
      toast.info("Selecciona una reparación de la lista para agregarla.");
    }

    if (e.key === "Backspace" && !inputValue && deviceForm.faults.length > 0) {
      removeFault(deviceForm.faults.length - 1);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="border border-gray-950 rounded-md p-2 flex flex-wrap gap-2 min-w-full items-center relative">
      {deviceForm.faults.map((fault, index) => (
        <span
          key={fault.id || index}
          className="capitalize flex items-center bg-blue-500 text-white text-sm px-3 py-1 rounded-full"
        >
          {fault.name}
          <button
            onClick={() => removeFault(index)}
            className="ml-2 focus:outline-none hover:text-red-300"
            type="button"
          >
            <X size={14} />
          </button>
        </span>
      ))}

      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Escribe una falla o servicio..."
        className="flex-grow min-w-[150px] outline-none bg-transparent text-sm"
      />

      {replacement.length > 0 && (
        <ul className="absolute top-10 left-0 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-[120px] overflow-y-auto z-10 shadow-lg">
          {replacement.map((r) => (
            <li
              key={r.id}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
              onClick={() => addFault(r)}
            >
              {r.name} —{" "}
              <span className="text-gray-500">${r.price.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FaultsInput;
