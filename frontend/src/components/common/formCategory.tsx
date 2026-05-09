import Modal from "./Modal";
import { useEffect, useState } from "react";
import { CategoryList } from "../types/product";

interface FormCategoryRenderProps {
  dataEdit?: CategoryList;
  title: string;
  isForm: boolean;
  closeForm: () => void;
  onSubmit: (categoryData: CategoryList) => void;
}

const getEmptyForm = (): CategoryList => ({
  id: "",
  name: "",
});

function FormCategory({
  dataEdit,
  title,
  isForm,
  closeForm,
  onSubmit,
}: FormCategoryRenderProps) {
  const [categoryForm, setDataForm] = useState<CategoryList>(getEmptyForm());
  useEffect(() => {
    const newDataForm = dataEdit != undefined ? dataEdit : getEmptyForm();
    setDataForm(newDataForm);
  }, [dataEdit]);

  const handleInputChange = (name: string, value: string) => {
    setDataForm((prev: CategoryList) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(categoryForm);
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
            htmlFor="category"
            className="flex flex-col w-full max-w-md gap-1"
          >
            <span>Categoria:</span>
            <input
              name="category"
              type="text"
              value={categoryForm.name}
              placeholder="Perifericos..."
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="p-2 rounded border"
            />
          </label>
        </div>

        <button
          type="submit"
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Crear categoria
        </button>
      </form>
    </Modal>
  );
}

export default FormCategory;
