import models from "../constants/models";
import { useDeviceFormStore } from "../store/useDeviceFormStore";
import { formatCOP } from "../utils/format";
import FaultsInput from "./FaultsInput";

interface DeviceFormEntry {
  onChange: (e: React.ChangeEvent<Element>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isEditing: boolean;
}

const DeviceForm = ({
  onChange,
  onSubmit,
  isEditing = false,
}: DeviceFormEntry) => {
  const { deviceForm } = useDeviceFormStore();

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
              value={deviceForm.client}
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
              value={deviceForm.device}
              onChange={onChange}
              aria-label="Nombre del dispositivo"
            />
          </label>
        </div>

        <div className="flex flex-row items-center gap-2">
          {/* Precio
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
          </label> */}

          {/* Modelo */}
          <label className="flex flex-col" htmlFor="model">
            <span>Modelo:</span>
            <select
              className="p-2 w-full text-[1rem] border"
              name="model"
              id="model"
              value={deviceForm.model}
              onChange={onChange}
              aria-label="Modelo del dispositivo"
              required
            >
              <option value="">Seleccione un modelo</option>
              {models.map((i) => (
                <option key={i.name} value={i.name}>
                  {i.name}
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
              className={`p-2 rounded border`}
              value={deviceForm.IMEI}
              onChange={onChange}
              aria-label="Número IMEI"
            />
          </label>
        </div>
        <div className="flex flex-row item-center gap-2 min-w-full max-h-[100px]">
          {/* Tipos de raparaciones*/}
          <FaultsInput value={deviceForm.faults} onChange={onChange} />
        </div>

        <div className="flex items-end justify-between w-full p-2">
          <label
            htmlFor="pay"
            className="relative flex items-center cursor-pointer text-2xl select-none"
          >
            {/* Checkbox oculto */}
            <input
              name="pay"
              id="pay"
              type="checkbox"
              checked={deviceForm.pay}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange({ target: { name: "pay", value: e.target.checked } })
              }
              className="absolute opacity-0 h-0 w-0 peer"
            />

            <div
              className="peer-checked:bg-[#4e7cd1] peer-checked:rounded-md peer-checked:animate-pulsebox 
    h-6 w-6 bg-gray-300 rounded-full transition duration-300 relative"
            >
              <div
                className="hidden peer-checked:block absolute left-[0.45em] top-[0.25em] w-[0.25em] h-[0.5em] 
      border-[0.15em] border-t-0 border-l-0 border-solid border-[#E0E0E2] 
      rotate-45 origin-top-left"
              ></div>
            </div>

            <span className="ml-3 text-base text-black">¿Esta pagado?</span>
          </label>

          <label className="relative flex items-center cursor-pointer text-2xl select-none">
            {/* Checkbox oculto */}
            <input
              type="checkbox"
              className="absolute opacity-0 h-0 w-0 peer"
            />

            {/* Checkmark custom */}
            <div
              className="peer-checked:bg-[#4e7cd1] peer-checked:rounded-md peer-checked:animate-pulsebox 
               h-6 w-6 bg-gray-300 rounded-full transition duration-300 relative"
            >
              {/* Checkmark visual */}
              <div
                className="hidden peer-checked:block absolute left-[0.45em] top-[0.25em] w-[0.25em] h-[0.5em] 
                 border-[0.15em] border-t-0 border-l-0 border-solid border-[#E0E0E2] 
                 rotate-45 origin-top-left"
              ></div>
            </div>

            {/* Texto opcional al lado */}
            <span className="ml-1 text-base text-black">
              ¿LE IMPRO EL TICKET?
            </span>
          </label>

          <span className="">{formatCOP(deviceForm.price)}</span>
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
              value={deviceForm.detail}
              onChange={onChange}
              aria-label="Observaciones del dispositivo"
            ></textarea>
          </label>
        </div>
      </div>

      {/* Botón de envío */}
      <button
        type="submit"
        disabled={!deviceForm.client || !deviceForm.device}
        className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isEditing ? "Actualizar dispositivo" : "Registrar ingreso"}
      </button>
    </form>
  );
};

export default DeviceForm;
