import { NumericFormat } from "react-number-format";
import Modal from "./Modal";
import { useEffect, useState } from "react";
import { ProductForm } from "../types/product";
import { useCategoryListStore } from "../store/category";

interface FormProductRenderProps {
  formProduct?: ProductForm;
  title: string;
  isForm: boolean;
  closeForm: () => void;
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
  formProduct,
  title,
  isForm,
  closeForm,
  onSubmit,
}: FormProductRenderProps) {
  const [dataForm, setDataForm] = useState<ProductForm>(getEmptyForm());
  const { categoryList } = useCategoryListStore();

  useEffect(() => {
    const newDataForm = formProduct != undefined ? formProduct : getEmptyForm();
    setDataForm(newDataForm);
  }, [formProduct]);

  const handleInputChange = (name: string, value: string) => {
    setDataForm((prev: ProductForm) => ({
      ...prev,
      [name]: value,
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
          <label
            htmlFor="product"
            className="flex flex-col w-full max-w-md gap-1"
          >
            <span>Producto:</span>
            <input
              name="product"
              type="text"
              value={dataForm.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="p-2 rounded border"
            />
          </label>
          <label htmlFor="" className="flex flex-col w-full max-w-md gap-1">
            <span>Categoria</span>
            <select
              name="category"
              className="w-full p-2 rounded border capitalize"
              required
              value={dataForm.category}
              onChange={(e) => handleInputChange("category", e.target.value)}
            >
              <option value="">Selecciona una categoria...</option>
              {categoryList.map((option) => {
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
          </label>
          <label
            htmlFor="stock"
            className="flex flex-col w-full max-w-md gap-1"
          >
            <span>Stock</span>
            <NumericFormat
              name="stock"
              className="p-2 rounded border"
              min={1}
              onChange={(e) => handleNumericChange("stock", e.target.value)}
              value={dataForm.stock}
            />
          </label>
          <label
            htmlFor="price"
            className="flex flex-col w-full max-w-md gap-1"
          >
            <NumericFormat
              name="price"
              value={dataForm.price}
              thousandSeparator="."
              decimalSeparator=","
              decimalScale={2}
              fixedDecimalScale
              allowNegative={false}
              prefix="$ "
              onValueChange={(values) =>
                handleNumericChange("price", values.value)
              }
              className="p-2 rounded border"
              placeholder="40.000"
            />
          </label>
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
