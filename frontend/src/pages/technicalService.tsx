import { useCategoryListStore } from "@/components/store/category";
import { useSearchStore } from "@/components/store/filters";
import React, { useEffect, useState, useMemo } from "react";
import { formatCOP } from "@/components/utils/format";
import Modal from "@/components/common/Modal";
import {
  searchDevices,
  deleteDevice,
  createDevice,
  updateDevice,
} from "@/components/services/devices.js";
import { TechnicalServiceEntry } from "@/components/types/technicalService.ts";
import { toast } from "react-toastify";
import { parseLAPrice } from "@/components/utils/ParsePrice";
import { DropDown } from "@/components/common/dropdown";
import DeviceForm from "@/components/common/formDevice";

const FAKE_CATEGORIES = [
  { category: "Sin Solución" },
  { category: "Reparado" },
  { category: "En Revisión" },
];

const DEVICES_STATUS = ["Reparado", "Sin Solución", "En Revisión"];
const LIST_OPCIONES = ["Editar", "Entregado", "Eliminar"];

const TechnicalService = () => {
  const [devices, setDevices] = useState<TechnicalServiceEntry[]>([]);
  const [isFormTechnical, setisFormTechnical] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { categorySelect, setCategoryList } = useCategoryListStore();
  const { search } = useSearchStore();

  const [devicesForm, setDevicesForm] = useState({
    client: "",
    device: "",
    damage: "",
    model: "",
    IMEI: "",
    mockslistRepairTypes: "",
    price: "",
    detail: "",
  });

  useEffect(() => {
    const getDevices = async () => {
      setIsLoading(true);
      try {
        const devices = await searchDevices(search);
        if (devices) {
          setDevices(devices);
        }
      } finally {
        setIsLoading(false);
      }
    };
    getDevices();
    setCategoryList(FAKE_CATEGORIES);
  }, [search, setCategoryList]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setDevicesForm((f) => ({
      ...f,

      [name]: value,
    }));
  };

  const clearForm = () => {
    setDevicesForm({
      client: "",
      device: "",
      damage: "",
      detail: "",
      model: "",
      IMEI: "",
      price: "",
    });
    setisFormTechnical(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    const newPrice = parseLAPrice(devicesForm.price);

    e.preventDefault();
    if (!/^\d{15,}$/.test(devicesForm.IMEI.toString())) {
      toast.warn("El IMEI debe tener al menos 15 dígitos numéricos.");
      return;
    }
    if (
      !devicesForm.client.trim() ||
      !devicesForm.device.trim() ||
      !devicesForm.model ||
      newPrice <= 0 ||
      devicesForm.IMEI.toString().trim().length != 15
    ) {
      toast.warning(
        "Verifica los campos: cliente, dispositivo, modelo, precio o IMEI."
      );
      return;
    }
    const editingDevice = isEditing
      ? devices.find((d) => d.id === editingDeviceId)
      : null;

    const deviceData = {
      client: devicesForm.client.trim(),
      device: devicesForm.device.trim(),
      damage: devicesForm.device.trim(),
      model: devicesForm.model,
      IMEI: devicesForm.IMEI,
      status: (editingDevice?.status ||
        "En Revisión") as TechnicalServiceEntry["status"],
      entryDate:
        editingDevice?.entryDate || new Date().toISOString().split("T")[0],
      exitDate: editingDevice?.exitDate || null,
      warrantLimit: editingDevice?.warrantLimit || null,
      price: newPrice,
      detail: devicesForm.detail,
    };

    try {
      if (isEditing && editingDeviceId) {
        await updateDevice(editingDeviceId, deviceData);
        setDevices((prev) =>
          prev.map((d) =>
            d.id === editingDeviceId
              ? ({
                  ...deviceData,
                  id: editingDeviceId,
                } as TechnicalServiceEntry)
              : d
          )
        );
        setIsEditing(false);
        setEditingDeviceId(null);
      } else {
        const createdDevice = await createDevice(deviceData);
        setDevices((prev) => [...prev, createdDevice]);
      }
      clearForm();
    } catch (error) {
      console.error("Error al guardar el dispositivo:", error);
      toast.error("Fallo al guardar el dispositivo. Intente de nuevo.");
    }
  };

  const handleDeleteDevice = async (id: string) => {
    try {
      await deleteDevice(id);
      setDevices((prev) => prev.filter((dev) => dev.id !== id));
    } catch (error) {
      console.error("Failed to delete device:", error);
      toast("Fallo a eliminar el dispositivo. Intente de nuevo.");
    }
  };

  const handleOutput = async (id: string, output: boolean) => {
    const newUpdatedDevice = devices.find((dev) => dev.id === id);

    if (!newUpdatedDevice) return;
    if (output && newUpdatedDevice.output) {
      toast.warning("El dispositivo ya está entregado.");
      return;
    }
    if (newUpdatedDevice.status == "En Revisión") {
      toast.warning("Hey!!, todavia no se a revisado el dispositivo.");
      return;
    }

    const warrantLimit = new Date();
    warrantLimit.setDate(warrantLimit.getDate() + 30);

    const newDevice = {
      ...newUpdatedDevice,
      output,
      exitDate: output ? new Date().toISOString().split("T")[0] : null,
      warrantLimit:
        newUpdatedDevice.status === "Reparado"
          ? warrantLimit.toISOString().split("T")[0]
          : null,
    };
    try {
      await updateDevice(id, newDevice);
      setDevices((prev) =>
        prev.map((dev) => (dev.id === id ? newDevice : dev))
      );
      toast.success("Dispositivo actualizado correctamente.");
    } catch (error) {
      console.error("Failed to update device output:", error);
      toast.warning("Fallo a actualizar el dispositivo. Intente de nuevo.");
    }
  };

  const handleStatusChange = async (
    id: string,
    output: boolean,
    status: TechnicalServiceEntry["status"]
  ) => {
    if (output) {
      toast.warning(
        "No se puede cambiar el estado de un dispositivo entregado."
      );
      return;
    }

    const updatedDevice = devices.find((dev) => dev.id === id);
    if (!updatedDevice) return;

    const newDevice = {
      ...updatedDevice,
      status,
      output,
    };

    try {
      await updateDevice(id, { status, output });
      setDevices((prev) =>
        prev.map((dev) => (dev.id === id ? newDevice : dev))
      );
    } catch (error) {
      console.error("Failed to update device status:", error);
      toast.warning("Fallo a actualizar el estado. Intente de nuevo.");
    }
  };

  const handlerEditDevice = (d: TechnicalServiceEntry) => {
    if (d.output) {
      toast.warning("No se puede editar un dispositivo entregado.");
      return;
    }
    setDevicesForm({
      client: d.client,
      device: d.device,
      damage: d.damage,
      model: d.model,
      IMEI: d.IMEI,
      price: d.price.toString(),
      detail: d.detail || "",
    });
    setIsEditing(true);
    setEditingDeviceId(d.id || "");
    setisFormTechnical(true);
  };

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      if (categorySelect === "todos") return true;
      return device.status === categorySelect;
    });
  }, [devices, categorySelect]);

  return (
    <div className="w-full h-full  p-4 text-white">
      <div className="flex justify-between p-3 items-center">
        <h2 className="text-xl font-bold mb-4">Servicio Técnico</h2>
        <button
          onClick={() => setisFormTechnical(true)}
          type="button"
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Formulario de Ingreso
        </button>
      </div>

      <div className="overflow-x-auto overflow-y-auto min-h-[60vh] max-h-[50vh]">
        <table className="w-full text-sm text-left text-gray-300 border-collapse">
          <thead className="sticky top-0 z-5 text-xs text-gray-700 uppercase bg-gray-400 dark:bg-[rgb(62,67,80)] dark:text-gray-300">
            <tr>
              <th className="px-4 py-2 cursor-pointer whitespace-nowrap">
                Cliente
              </th>
              <th className="px-4 py-2 cursor-pointer whitespace-nowrap">
                Dispositivo
              </th>
              <th className="px-4 py-2 cursor-pointer whitespace-nowrap">
                IMEI
              </th>
              <th className="px-4 py-2 cursor-pointer whitespace-nowrap">
                Precio
              </th>
              <th className="px-4 py-2 cursor-pointer whitespace-nowrap">
                Estado
              </th>
              <th className="px-4 py-2 cursor-pointer whitespace-nowrap">
                Ingreso
              </th>
              <th className="px-4 py-2 cursor-pointer whitespace-nowrap">
                Garantia
              </th>
              <th className="px-4 py-2 cursor-pointer whitespace-nowrap">
                Entregado
              </th>
              <th className="px-4 py-2 cursor-pointer whitespace-nowrap">
                Salida
              </th>
              <th className="px-4 py-2 cursor-pointer whitespace-nowrap">
                Opciones
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="p-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filteredDevices.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-4 text-center text-gray-500">
                  No se encontraron resultados.
                </td>
              </tr>
            ) : (
              filteredDevices.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700"
                >
                  <td className="p-2">{d.client}</td>
                  <td className="p-2">{d.device}</td>
                  <td className="p-2">{d.IMEI}</td>
                  <td className="p-2">{formatCOP(d.price)}</td>
                  <td className="p-2">
                    <DropDown
                      items={DEVICES_STATUS}
                      select={d.status}
                      onSelect={(newStatus) =>
                        handleStatusChange(
                          d.id,
                          d.output,
                          newStatus as TechnicalServiceEntry["status"]
                        )
                      }
                    />
                  </td>
                  <td className="p-2">{d.entryDate}</td>
                  <td className="p-2">{d.warrantLimit || "-"}</td>
                  <td className="p-2">{d.output ? "Si" : "No"}</td>
                  <td className="p-2">{d.exitDate || "-"}</td>
                  <td className="p-2">
                    <DropDown
                      items={LIST_OPCIONES}
                      title="Opciones"
                      onSelect={(newStatus) =>
                        newStatus === "Editar"
                          ? handlerEditDevice(d)
                          : newStatus === "Entregado"
                          ? handleOutput(d.id, true)
                          : newStatus === "Eliminar"
                          ? handleDeleteDevice(d.id)
                          : null
                      }
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        title={isEditing ? "Editar dispositivo" : "Formulario de Ingreso"}
        isOpen={isFormTechnical}
        onClose={() => {
          setisFormTechnical(false);
          setIsEditing(false);
          setEditingDeviceId(null);
        }}
      >
        <DeviceForm
          formData={devicesForm}
          onChange={handleInputChange}
          onSubmit={handleFormSubmit}
          isEditing={false}
        />
      </Modal>
    </div>
  );
};

export default TechnicalService;
