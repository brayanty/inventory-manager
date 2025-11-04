import React, { useState } from "react";

interface ContactPhone {
  id: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value: string;
}

export default function ContactPhone({ id, onChange, value }: ContactPhone) {
  const [phone, setPhone] = useState("");

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);

    const formatted = digits
      .replace(/^(\d{3})(\d{3})(\d{2})(\d{0,2})$/, "$1-$2-$3-$4")
      .replace(/-$/, "");

    return formatted;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phone = e.target.value;

    setPhone(formatPhone(phone));
    onChange(formatPhone(phone));
  };

  return (
    <label className="flex flex-col" htmlFor={id}>
      <span>Numero de celular:</span>
      <input
        type="tel"
        id={id}
        className="input validator bg-white tabular-nums border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
        placeholder="Numero de celular"
        value={phone}
        onChange={handleChange}
        inputMode="numeric"
        pattern="\d{3}-\d{3}-\d{2}-\d{2}"
        title="Debe tener 10 dígitos (ej. 324-434-43-44)"
      />
    </label>
  );
}
