import { NumericFormat } from "react-number-format";
import models from "../constants/models";
import { useDeviceFormStore } from "../store/useDeviceFormStore";
import { formatCOP } from "../utils/format";
import Checkbox from "./checkbox";
import FaultsInput from "./FaultsInput";
import ContactPhone from "./contactPhone";

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
      className="text-black flex flex-col items-center flex-wrap gap-4"
      onSubmit={onSubmit}
    >
      <div className="grid grid-cols-2 gap-4 w-full max-w-4xl">
        {/* Cliente */}
        <label className="flex flex-col " htmlFor="client">
          <span>Cliente:</span>
          <input
            type="text"
            name="client"
            id="client"
            placeholder="Petrolino Sinforoso"
            className="input validator bg-white tabular-nums border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={deviceForm.client}
            onChange={onChange}
            aria-label="Nombre del cliente"
          />
        </label>
        <ContactPhone id="cel" onChange={onChange} value={deviceForm.cel} />

        {/* Dispositivo */}
        <label className="flex flex-col" htmlFor="device">
          <span>Dispositivo:</span>
          <input
            type="text"
            name="device"
            id="device"
            placeholder="iPhone 14 Pro Max"
            className="input validator bg-white tabular-nums border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={deviceForm.device}
            onChange={onChange}
            aria-label="Nombre del dispositivo"
          />
        </label>

        {/* Precio */}
        <label className="flex flex-col" htmlFor="price">
          <span>Precio Abonado:</span>
          <NumericFormat
            id="pricePay"
            name="pricePay"
            value={deviceForm.pricePay}
            thousandSeparator="."
            decimalSeparator=","
            decimalScale={2}
            fixedDecimalScale
            allowNegative={false}
            onValueChange={(values) =>
              onChange({
                target: {
                  name: "pricePay",
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
            className="input validator bg-white tabular-nums border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            placeholder="Escriba el IMEI del dispositivo"
            className="input validator bg-white tabular-nums border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={deviceForm.IMEI}
            onChange={onChange}
            aria-label="Número IMEI"
          />
        </label>
      </div>
      <div className="flex flex-col w-full">
        {/* Tipos de raparaciones*/}
        <FaultsInput onChange={onChange} />
      </div>
      <div className="flex flex-row justify-between w-full max-w-md gap-2">
        <Checkbox
          title="Esta pagado"
          ID="pay"
          checked={deviceForm.pay}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ target: { name: "pay", value: e.target.checked } })
          }
        />
        <div className="flex flex-col items-end gap-1 ">
          <label className="flex flex-col items-end" htmlFor="priceView">
            <span className="">Total: </span>
            {formatCOP(deviceForm.price)}
          </label>
        </div>
      </div>
      {/* Observaciones */}
      <label className="flex flex-col w-full" htmlFor="detail">
        <span>Observaciones:</span>
        <textarea
          name="detail"
          id="detail"
          placeholder="El dispositivo está apagado, con rayas a los costados"
          className="p-1 rounded border"
          value={deviceForm.detail}
          onChange={onChange}
          aria-label="Observaciones del dispositivo"
        ></textarea>
      </label>
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
