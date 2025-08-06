import { NumericFormat } from "react-number-format";
import Modal from "./Modal";
import { ChangeEvent, useState } from "react";


function FormRender({ isForm = true, closeForm }: { isForm: boolean, closeForm: () => void }) {
    const [dataForm, setDataForm] = useState(
        {
            name: "",
            quantity: "",
            category: "",
            entire: "",
            price: "",
            sales: ""
        }
    )

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        console.log(e)
    }

    const handlerSubmit = (e) => {
        e.preventDefault()

        setDataForm((prev) => {
            prev
        })
    }


    return <Modal
        title="Formulario de Ingreso"
        isOpen={isForm}
        onClose={() => {
            closeForm()
        }}
    >
        <form className="h-full w-full text-black flex flex-col flex-wrap justify-between items-center gap-4">
            <div className="flex flex-wrap gap-2">
                <div className="flex flex-row items-center gap-2">
                    <label className="flex flex-col" htmlFor="client">
                        <span>Cliente: </span>
                        <input
                            type="text"
                            name="client"
                            id="client"
                            placeholder="Petrolino Sinforoso"
                            className="p-2 rounded border"
                            value={dataForm.name}
                            onChange={handleInputChange}
                            aria-label="Nombre del cliente"
                        />
                    </label>
                    <label className="flex flex-col" htmlFor="device">
                        <span>Categoria: </span>
                        <input
                            type="text"
                            name="device"
                            id="device"
                            placeholder="Iphone 14 Pro Max"
                            className="p-2 rounded border"
                            value={dataForm.category}
                            onChange={handleInputChange}
                            aria-label="Nombre del dispositivo"
                        />
                    </label>
                </div>
                <div className="flex flex-row items-center gap-2">
                    <label className="flex flex-col" htmlFor="total">
                        <span>Total: </span>
                       <input  type="number" name="total"
                className="p-2 rounded border"
                        />
                    </label>
                    <label className="flex flex-col" htmlFor="price">
                        <span>Price: </span>
                        <NumericFormat
                            id="price"
                            name="price"
                            value={dataForm.price}
                            thousandSeparator="."
                            decimalSeparator=","
                            decimalScale={2}
                            fixedDecimalScale
                            allowNegative={false}
                            onChange={(v) => handleInputChange(v)}
                            className="p-2 rounded border"
                            placeholder="40.000"
                        />
                    </label>
                </div>
            </div>
            <button
                type="submit"
                onClick={(e) => { handlerSubmit(e) }}
                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
            >
                Registrar ingreso
            </button>
        </form>
    </Modal>
}

export default FormRender