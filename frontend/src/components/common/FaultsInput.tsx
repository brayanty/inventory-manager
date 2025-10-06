import React, { useState, KeyboardEvent, ChangeEvent } from 'react';

interface FaultsInputProps {
  value: string[];
  onChange?: (e: { target: { name: string; value: string[] } }) => void;
}

const FaultsInput: React.FC<FaultsInputProps> = ({ value, onChange }) => {
  const [inputValue, setInputValue] = useState('');

  const addFault = (newFault: string) => {
    const trimmed = newFault.trim();
    if (trimmed && !value.includes(trimmed)) {
      const updated = [...value, trimmed];
      onChange?.({ target: { name: 'faults', value: updated } });
    }
  };

  const removeFault = (index: number) => {
    const updated = value.filter((_, i) => i !== index);
    onChange?.({ target: { name: 'faults', value: updated } });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      addFault(inputValue);
      setInputValue('');
    }

    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeFault(value.length - 1);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="border border-gray-950 rounded-md p-2 flex flex-wrap gap-2 min-h-max max-w-full min-w-full items-center">
      {value.map((fault, index) => (
        <span
          key={index}
          className="flex items-center bg-blue-500 text-white text-sm px-3 py-1 rounded-full"
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
    </div>
  );
};

export default FaultsInput;
