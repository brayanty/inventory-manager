import { NumericFormat } from "react-number-format";
import Modal from "./Modal";
import { useState } from "react";
import { CategoryList } from "../types/product";
import { toast } from "react-toastify";

type FieldType = "text" | "number" | "price" | "select";
type FormElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
interface FormFieldProps {
  items?: CategoryList[];
  label: string;
  name: string;
  placeholder?: string;
  type: FieldType;
}

interface FormRenderProps {
  title: string;
  isForm: boolean;
  closeForm: () => void;
  fields: FormFieldProps[];
  onSubmit: (formData: Record<string, any>) => void;
}

function FormRender({
  title,
  isForm,
  closeForm,
  fields,
  onSubmit,
}: FormRenderProps) {
  const [dataForm, setDataForm] = useState<Record<string, any>>({});

  const handleInputChange = (e: React.ChangeEvent<FormElement>) => {
    const { name, value } = e.target;
    if (name === undefined || value === undefined) {
      toast.error("Error al capturar los datos del formulario.");
      return;
    }

    setDataForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePriceChange = (name: string, value: string) => {
    setDataForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(dataForm);
    setDataForm(
      fields.reduce((acc, field) => {
        acc[field.name] = "";
        return acc;
      }, {} as Record<string, any>)
    );
  };
  return (
    <Modal
      key={title}
      title={title || "Formulario"}
      isOpen={isForm}
      onClose={closeForm}
    >
      <form
        className="h-full w-full text-black flex flex-col flex-wrap justify-between items-center gap-4"
        onSubmit={handlerSubmit}
      >
        <div className="flex flex-wrap gap-2">
          {fields.map((field) => (
            <label
              key={field.name}
              className="flex flex-col w-full max-w-md gap-1"
              htmlFor={field.name}
            >
              <span>{field.label}:</span>
              {field.type === "select" ? (
                <select
                  name={field.name}
                  id={field.name}
                  className="w-full p-2 rounded border capitalize"
                  required
                  value={dataForm[field.name] || ""}
                  onChange={(e) => handleInputChange(e)}
                >
                  <option value="">Selecciona una categoria...</option>
                  {field.items?.map((option) => (
                    <option
                      className="capitalize"
                      value={option.category}
                      key={option.category}
                    >
                      {option.category}
                    </option>
                  ))}
                </select>
              ) : field.type === "price" ? (
                <NumericFormat
                  id={field.name}
                  name={field.name}
                  value={dataForm[field.name] || ""}
                  thousandSeparator="."
                  decimalSeparator=","
                  decimalScale={2}
                  fixedDecimalScale
                  allowNegative={false}
                  prefix="$ "
                  onValueChange={(values) =>
                    handlePriceChange(field.name, values.value)
                  }
                  className="p-2 rounded border"
                  placeholder={field.placeholder}
                />
              ) : (
                <input
                  type={field.type}
                  id={field.name}
                  name={field.name}
                  inputMode={field.type === "number" ? "numeric" : "text"}
                  value={dataForm[field.name] || ""}
                  onChange={handleInputChange}
                  placeholder={field.placeholder}
                  className="p-2 rounded border"
                  onKeyDown={(e) => {
                    if (
                      field.type === "number" &&
                      ["e", "E", "+", "-"].includes(e.key)
                    ) {
                      e.preventDefault();
                    }
                  }}
                />
              )}
            </label>
          ))}
        </div>

        <button
          type="submit"
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Registrar ingreso
        </button>
      </form>
    </Modal>
  );
}

export default FormRender;
