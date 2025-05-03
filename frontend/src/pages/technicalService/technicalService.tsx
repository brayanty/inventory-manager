import { useCategoryListStore } from "@/components/store/category";
import { useSearchStore } from "@/components/store/filters";
import React, { useEffect, useState } from "react";
import formatCOP from "@/components/utils/format";
import Modal from "@/components/common/Modal";
import models from "@/components/constants/models.ts";
import { searchDevices, deleteDevice } from "@/components/services/devices.js";
import { TechnicalServiceEntry } from "@/components/types/technicalService.ts";

const TechnicalService = () => {
  const [devices, setDevices] = useState<TechnicalServiceEntry[]>([]);
  const [isFormTechnical, setisFormTechnical] = useState<boolean>(false);
  const { categorySelect, setCategoryList } = useCategoryListStore();

  const [devicesForm, setDevicesForm] = useState({
    client: "",
    device: "",
    models: "",
    IMEI: "",
    price: "",
    detail: "",
  });

  const [isSelectDetail, setSelectDetail] = useState<TechnicalServiceEntry>();
  const [isDetail, setIsDetail] = useState<boolean>(false);

  const handlerSetDetail = (device: TechnicalServiceEntry) => {
    if (!device) return;
    setIsDetail(true);
    setSelectDetail(device);
  };

  const { search } = useSearchStore();

  useEffect(() => {
    const getDevices = async () => {
      const devices = await searchDevices(search);
      if (devices) {
        setDevices(devices);
      }
    };
    getDevices();
    const fakeCategories = [
      { category: "Todos" },
      { category: "En reparación" },
      { category: "Reparado" },
      { category: "No reparado" },
    ];
    setCategoryList(fakeCategories);
  }, [search, setDevices]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLElement | HTMLTextAreaElement>
  ) => {
    console.log(devicesForm);
    const { name, value } = e.target;

    setDevicesForm((f) => ({
      ...f,
      [name]: name === "price" ? parseFloat(value) || 0 : value,
    }));
  };

  // const handleAddDevice = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (
  //     !formData.client.trim() ||
  //     !formData.device.trim() ||
  //     formData.price <= 0 ||
  //     isNaN(formData.price)
  //   ) {
  //     alert("Please fill in all fields with valid values.");
  //     return;
  //   }

  //   const newDevice: TechnicalServiceEntry = {
  //     id: Date.now().toString(),
  //     client: formData.client.trim(),
  //     device: formData.device.trim(),
  //     models: formData.models.trim(),
  //     IMEI: formData.IMEI,
  //     status: "En reparación",
  //     entryDate: new Date().toISOString().split("T")[0],
  //     exitDate: null,
  //     warrantLimit: null,
  //     price: formData.price,
  //     detail: formData.detail,
  //   };
  //   createDevice(newDevice);
  //   setDevices((prev) => [...prev, newDevice]);
  //   setFormData({
  //     client: "",
  //     device: "",
  //     detail: "",
  //     models: "",
  //     IMEI: 0,
  //     price: 0,
  //   });
  // };

  const handleStatusChange = (
    id: string,
    status: "Reparado" | "No reparado"
  ) => {
    setDevices((prev) => {
      const exitDate = new Date();
      const warrantLimit = new Date(exitDate);
      warrantLimit.setDate(warrantLimit.getDate() + 30);
      return prev.map((dev) =>
        dev.id === id
          ? {
              ...dev,
              status,
              exitDate: exitDate.toISOString().split("T")[0],
              warrantLimit:
                status === "Reparado"
                  ? warrantLimit.toISOString().split("T")[0]
                  : null,
            }
          : dev
      );
    });
  };

  const filteredDevices = devices.filter((device) => {
    if (categorySelect === "Todos") return true; //si "todos" se selecciona, no filtra nada
    return device.status === categorySelect; //filtra por el estado seleccionado
  });

  return (
    <div className="p-4 text-white">
      <h2 className="te xt-xl font-bold mb-4">Servicio Técnico</h2>
      <button
        onClick={() => setisFormTechnical(true)}
        type="button"
        className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
      >
        Formulario de Ingreso
      </button>

      {/* Tabla */}
      <div className="overflow-x-auto overflow-y-auto">
        <table className="w-full text-sm text-left text-gray-300 border-collapse">
          <thead className="bg-gray-700 text-xs uppercase">
            <tr>
              <th className="p-2">Cliente</th>
              <th className="p-2">Dispositivo</th>
              <th className="p-2">IMEI</th>
              <th className="p-2">Precio</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Ingreso</th>
              <th className="p-2">Garantia</th>
              <th className="p-2">Salida</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredDevices?.map((d) => (
              <tr key={d.id} className="border-b border-gray-600">
                <td className="p-2">{d.client}</td>
                <td className="p-2">{d.device}</td>
                <td className="p-2">{d.IMEI}</td>
                <td className="p-2">{formatCOP(d.price)}</td>
                <td className="p-2">{d.status ? "Reparado" : "Muerto"}</td>
                <td className="p-2">{d.entryDate}</td>
                <td className="p-2">{d.warrantLimit}</td>
                <td className="p-2">{d.exitDate || "-"}</td>
                <td className="p-2">
                  <div className="flex flex-row gap-2  items-center justify-between">
                    <button
                      onClick={() => {
                        setDevices(devices.filter((dev) => dev.id !== d.id));
                        deleteDevice(d.id);
                      }}
                      className="bg-red-600 px-2 py-1 rounded hover:bg-red-700"
                    >
                      Eliminar
                    </button>
                    <button
                      onClick={() => setIsDetail(true)}
                      className="bg-yellow-600 px-2 py-1 rounded hover:bg-yellow-700"
                    >
                      Ver más
                    </button>

                    {d.status === "En reparación" && (
                      <>
                        <button
                          onClick={() => handleStatusChange(d.id, "Reparado")}
                          className="bg-green-600 px-2 py-1 rounded hover:bg-green-700"
                        >
                          Reparado
                        </button>
                        <button
                          onClick={() =>
                            handleStatusChange(d.id, "No reparado")
                          }
                          className="bg-red-600 px-2 py-1 rounded hover:bg-red-700"
                        >
                          No reparado
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredDevices.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  No se encontraron resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/*datos adicionales*/}
      <Modal
        title="Detalles del dispositivo"
        isOpen={isDetail}
        onClose={() => setIsDetail(false)}
      >
        {!isSelectDetail && <p>No details available.</p>}

        <div className="flex flex-col gap-4 text-black">
          <h3 className="text-lg font-bold">Detalles del dispositivo</h3>
          <p>Cliente: {isSelectDetail?.client}</p>
          <p>Dispositivo: {isSelectDetail?.device}</p>
          <p>detalles: {isSelectDetail?.detail}</p>
          <p>Precio: {isSelectDetail?.price}</p>
          <p>Estado: {isSelectDetail?.status}</p>
          <p>Fecha de ingreso: {isSelectDetail?.entryDate}</p>
          <p>Fecha de salida: {isSelectDetail?.exitDate}</p>
          <p>Fecha de garantia: {isSelectDetail?.warrantLimit}</p>
        </div>
      </Modal>
      {/* Formulario de ingreso */}
      <Modal
        title="Fomulario de Ingreso"
        isOpen={isFormTechnical}
        onClose={() => setisFormTechnical(false)}
      >
        <form className="h-full w-full text-black flex flex-col flex-wrap justify-between items-center gap-4">
          <div className="flex flex-wrap ga-2">
            <div className="flex flex-row items-center gap-2">
              <label className="flex flex-col" htmlFor="client">
                <span>Cliente: </span>
                <input
                  type="text"
                  name="client"
                  id="client"
                  placeholder="Petrolino Sinforoso"
                  className="p-2 rounded border"
                  value={devicesForm.client}
                  onChange={handleInputChange}
                />
              </label>
              <label className="flex flex-col" htmlFor="device">
                <span>Dispositivo: </span>
                <input
                  type="text"
                  name="device"
                  id="device"
                  placeholder="Iphone 14 Pro Max"
                  className="p-2 rounded border"
                  value={devicesForm.device}
                  onChange={handleInputChange}
                />
              </label>
            </div>
            <div className="flex flex-row items-center gap-2">
              <label className="flex flex-col" htmlFor="Price">
                <span>Price: </span>
                <input
                  type="text"
                  name="price"
                  id="price"
                  className="p-2 rounded border"
                  value={devicesForm.price}
                  onChange={handleInputChange}
                />
              </label>
              <label className="flex flex-col" htmlFor="models">
                <span>Modelo: </span>
                <select
                  className="p-2 w-full text-[1rem] border"
                  name="models"
                  id="models"
                >
                  {models.map((i) => (
                    <option
                      className="flex flex-col justify-center font-bold text-[1rem]"
                      value={i.nombre}
                    >
                      {i.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <label className="flex flex-col" htmlFor="Price">
                <span>IMEI: </span>
                <input
                  type="text"
                  name="IMEI"
                  id="IMEI"
                  className="p-2 rounded border"
                  value={devicesForm.IMEI}
                  onChange={handleInputChange}
                />
              </label>
            </div>
            <div className="w-full">
              <label className="w-full" htmlFor="detail">
                <span>Observaciones: </span>
                <textarea
                  name="detail"
                  id="detail"
                  placeholder="El dispositivo esta apagado, con rayas a los constados "
                  className="p-2 w-full max-w-full min-h-[100px] max-h-[100px] rounded border"
                  value={devicesForm.detail}
                  onChange={handleInputChange}
                ></textarea>
              </label>
            </div>
          </div>
          <button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
            }}
            className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Registrar ingreso
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default TechnicalService;
