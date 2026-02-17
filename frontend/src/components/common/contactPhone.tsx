import React from "react";

interface ContactPhoneProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

export default function ContactPhone({
  id,
  value,
  onChange,
}: ContactPhoneProps) {
  const formatPhone = (input: string): string => {
    const digits = input.replace(/\D/g, "").slice(0, 10);

    if (digits.length === 0) return "";

    const formats = [
      digits.slice(0, 3),
      digits.slice(3, 6),
      digits.slice(6, 8),
      digits.slice(8, 10),
    ].filter((part) => part.length > 0);

    return formats.join("-");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <label className="flex flex-col" htmlFor={id}>
      <span>Número de celular:</span>
      <input
        type="tel"
        id={id}
        className="input validator bg-white tabular-nums border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
        placeholder="324-434-43-44"
        value={formatPhone(value)}
        onChange={handleChange}
        inputMode="tel"
        pattern="\d{3}-\d{3}-\d{2}-\d{2}"
        title="Debe tener 10 dígitos (ej. 324-434-43-44)"
      />
    </label>
  );
}
