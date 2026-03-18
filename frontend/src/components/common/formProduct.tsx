import { NumericFormat } from "react-number-format";
import Modal from "./Modal";
import { useState } from "react";
import { CategoryList, ProductForm } from "../types/product";

type FieldType = "text" | "number" | "price" | "select" | "numeric";

type FormElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

interface FormFieldProps {
  items?: CategoryList[];
  label: string;
  name: keyof ProductForm;
  placeholder?: string;
  type: FieldType;
}

interface FormRenderProps {
  dataEdit?: ProductForm;
  title: string;
  isForm: boolean;
  closeForm: () => void;
  fields: FormFieldProps[];
  onSubmit: (formData: ProductForm) => void;
}

const getEmptyForm = (): ProductForm => ({
  id: "",
  name: "",
  category: "",
  price: "",
  stock: 0,
});

function FormRender({
  dataEdit = getEmptyForm(),
  title,
  isForm,
  closeForm,
  fields,
  onSubmit,
}: FormRenderProps) {
  const [dataForm, setDataForm] = useState<ProductForm>(dataEdit);

  const handleInputChange = (e: React.ChangeEvent<FormElement>) => {
    const { name, value, type } = e.target;
    setDataForm((prev: ProductForm) => ({
      ...prev,
      [name]: type === "number" ? parseInt(value) : value,
    }));
  };

  const handleNumericChange = (name: string, value: string) => {
    setDataForm((prev: ProductForm) => ({
      ...prev,
      [name]: name === "price" ? Number(value) : parseInt(value),
    }));
  };

  const handlerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(dataForm);
    setDataForm(getEmptyForm);
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
                  value={dataForm[field.name]}
                  onChange={(e) => handleInputChange(e)}
                >
                  <option value="">Selecciona una categoria...</option>
                  {field.items?.map((option) => {
                    return (
                      <option
                        className="capitalize"
                        value={option.name}
                        key={option.name}
                      >
                        {option.name}
                      </option>
                    );
                  })}
                </select>
              ) : field.type === "numeric" ? (
                <NumericFormat
                  id={field.name}
                  className="p-2 rounded border"
                  min={1}
                  onChange={(e) =>
                    handleNumericChange(field.name, e.target.value)
                  }
                  value={dataForm[field.name]}
                />
              ) : field.type === "price" ? (
                <NumericFormat
                  id={field.name}
                  name={field.name}
                  value={dataForm[field.name]}
                  thousandSeparator="."
                  decimalSeparator=","
                  decimalScale={2}
                  fixedDecimalScale
                  allowNegative={false}
                  prefix="$ "
                  onValueChange={(values) =>
                    handleNumericChange(field.name, values.value)
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
                  value={dataForm[field.name]}
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
