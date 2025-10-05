import { NumericFormat } from "react-number-format";
import models from "../constants/models";

const DeviceForm = ({ formData, onChange, onSubmit, isEditing = false }) => {
  const mockslistRepairTypes = [
    "Pantalla",
    "Batería",
    "Cámara",
    "Puerto de carga",
    "Micrófono",
  ];
  return (
    <form
      className="h-full w-full text-black flex flex-col flex-wrap justify-between items-center gap-4"
      onSubmit={onSubmit}
    >
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-row items-center gap-2">
          {/* Cliente */}
          <label className="flex flex-col" htmlFor="client">
            <span>Cliente:</span>
            <input
              type="text"
              name="client"
              id="client"
              placeholder="Petrolino Sinforoso"
              className="p-2 rounded border"
              value={formData.client}
              onChange={onChange}
              aria-label="Nombre del cliente"
            />
          </label>

          {/* Dispositivo */}
          <label className="flex flex-col" htmlFor="device">
            <span>Dispositivo:</span>
            <input
              type="text"
              name="device"
              id="device"
              placeholder="iPhone 14 Pro Max"
              className="p-2 rounded border"
              value={formData.device}
              onChange={onChange}
              aria-label="Nombre del dispositivo"
            />
          </label>
        </div>

        <div className="flex flex-row items-center gap-2">
          {/* Precio */}
          <label className="flex flex-col" htmlFor="price">
            <span>Precio:</span>
            <NumericFormat
              id="price"
              name="price"
              value={formData.price}
              thousandSeparator="."
              decimalSeparator=","
              decimalScale={2}
              fixedDecimalScale
              allowNegative={false}
              onValueChange={(values) =>
                onChange({
                  target: {
                    name: "price",
                    value: values.value,
                  },
                })
              }
              className="p-2 rounded border"
              placeholder="40.000"
            />
          </label>

          {/* Modelo */}
          <label className="flex flex-col" htmlFor="model">
            <span>Modelo:</span>
            <select
              className="p-2 w-full text-[1rem] border"
              name="model"
              id="model"
              value={formData.model}
              onChange={onChange}
              aria-label="Modelo del dispositivo"
              required
            >
              <option value="">Seleccione un modelo</option>
              {models.map((i) => (
                <option key={i.nombre} value={i.nombre}>
                  {i.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-row item-center gap-2">
          {/* IMEI */}
          <label className="flex flex-col" htmlFor="IMEI">
            <span>IMEI:</span>
            <input
              type="text"
              name="IMEI"
              id="IMEI"
              maxLength={15}
              inputMode="numeric"
              pattern="\d*"
              className={`p-2 rounded border ${
                formData.IMEI.toString().length <= 14 ? "bg-gray-300" : ""
              }`}
              value={formData.IMEI}
              onChange={onChange}
              aria-label="Número IMEI"
            />
          </label>
        </div>
        <div className="flex flex-row item-center gap-2">
          {/* Tipos de raparaciones*/}
          <label className="flex flex-col" htmlFor="model">
            <span>¿Reparacion?:</span>
            <select
              className="p-2 w-full text-[1rem] border"
              name="model"
              id="model"
              value={formData.typeRepair}
              onChange={onChange}
              aria-label="reparación del dispositivo"
              required
            >
              <option value="">¿Que se va a reparar?</option>
              {mockslistRepairTypes.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Observaciones */}
        <div className="w-full">
          <label className="w-full" htmlFor="detail">
            <span>Observaciones:</span>
            <textarea
              name="detail"
              id="detail"
              placeholder="El dispositivo está apagado, con rayas a los costados"
              className="p-2 w-full max-w-full min-h-[100px] max-h-[100px] rounded border"
              value={formData.detail}
              onChange={onChange}
              aria-label="Observaciones del dispositivo"
            ></textarea>
          </label>
        </div>
      </div>

      {/* Botón de envío */}
      <button
        type="submit"
        disabled={
          !formData.client || !formData.device || formData.IMEI.length !== 15
        }
        className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isEditing ? "Actualizar dispositivo" : "Registrar ingreso"}
      </button>
    </form>
  );
};

export default DeviceForm;
