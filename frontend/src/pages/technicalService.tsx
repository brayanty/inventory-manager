import React, { useEffect, useState, useMemo } from "react";
import { formatCOP } from "@/components/utils/format";
import {
  DEVICE_CATEGORY,
  DEVICES_STATUS,
  DEVICE_LIST_OPTION,
} from "@/components/constants/constTecnicalService";
import Modal from "@/components/common/Modal";
import {
  deleteDevice,
  createDevice,
  updateDevice,
} from "@/components/services/devices.js";
import useLodingDevice from "@/components/hooks/useLodingDevice";
import { useCategoryListStore } from "@/components/store/category";
import { TechnicalServiceEntry } from "@/components/types/technicalService.ts";
import { toast } from "react-toastify";
import { DropDown } from "@/components/common/dropdown";
import DeviceForm from "@/components/common/formDevice";
import { useDeviceFormStore } from "@/components/store/useDeviceFormStore";
import ReadQR from "@/components/readQR/readQR";
import Button from "@/components/common/button";
import Paginator from "@/components/common/paginator";

const TechnicalService = () => {
  const { devices, setDevices, isLoading } = useLodingDevice();
  const { categorySelect, setCategoryList } = useCategoryListStore();

  const [isFormTechnical, setisFormTechnical] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);

  const { deviceForm, setDeviceForm, setDeviceFormEdit } = useDeviceFormStore();

  const [isOpenQR, setOpenQR] = useState(false);

  const [deviceDetail, setDeviceDetail] = useState<TechnicalServiceEntry>();
  const [isOpenDetail, setOpenDetail] = useState(false);

  useEffect(() => {
    setCategoryList(DEVICE_CATEGORY);
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setDeviceForm(name, value);
  };

  const clearForm = () => {
    setDeviceFormEdit({
      client: "",
      device: "",
      cel: "",
      damage: "",
      detail: "",
      model: "",
      IMEI: "",
      price: 0,
      faults: [],
      pay: false,
      pricePay: 0,
    });
    setisFormTechnical(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    const newPrice = deviceForm.price;

    e.preventDefault();
    if (
      !deviceForm.client.trim() ||
      !deviceForm.device.trim() ||
      !deviceForm.model ||
      newPrice <= 0
    ) {
      toast.warning(
        "Verifica los campos: cliente, dispositivo, modelo, precio."
      );
      return;
    }
    const editingDevice = isEditing
      ? devices.find((d) => d.id === editingDeviceId)
      : null;

    const deviceData = {
      client: deviceForm.client.trim(),
      device: deviceForm.device.trim(),
      damage: deviceForm.device.trim(),
      model: deviceForm.model,
      IMEI: deviceForm.IMEI || "000000000000000",
      status: (editingDevice?.status ||
        "En Revisión") as TechnicalServiceEntry["status"],
      entryDate:
        editingDevice?.entryDate || new Date().toISOString().split("T")[0],
      exitDate: editingDevice?.exitDate || null,
      warrantLimit: editingDevice?.warrantLimit || null,
      price: newPrice,
      pricePay: deviceForm.pricePay,
      detail: deviceForm.detail,
      faults: deviceForm.faults,
      output: editingDevice?.output || false,
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
        const response = await createDevice(deviceData);
        if (response.success) {
          setDevices((prev) => [...prev, response.data]);
          toast.success("Dispositivo guardado correctamente.");
          toast.warning(`${response.message.message}`);
        } else {
          toast.error(`${response.message}`);
          return;
        }
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

    setDeviceFormEdit({
      client: d.client,
      device: d.device,
      cel: d.cel,
      damage: d.damage,
      model: d.model,
      IMEI: d.IMEI,
      price: d.price,
      detail: d.detail || "",
      faults: d.faults,
      pay: d.pay,
      pricePay: d.pricePay || 0,
    });
    setIsEditing(true);
    setEditingDeviceId(d.id || "");
    setisFormTechnical(true);
  };

  const handleDeviceSearchQR = (device: TechnicalServiceEntry) => {
    setDeviceDetail(device);
    setOpenDetail(true);
    setOpenQR(false);
  };

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      if (categorySelect === "todos") return true;
      return device.status === categorySelect;
    });
  }, [devices, categorySelect]);

  return (
    <div className="w-full h-full p-2 text-white">
      <div className="flex justify-between p-3 max-md:p-2 items-center">
        <h2 className="max-md:text-[1em] text-xl font-bold mb-4">
          Servicio Técnico
        </h2>
        <div className="flex justify-between gap-2">
          <Button
            onClick={() => {
              setisFormTechnical(true);
            }}
            className="bg-blue-600 text-[.8em] px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Formulario de Ingreso
          </Button>
          <Button
            onClick={() => {
              setOpenQR(true);
            }}
            className="bg-blue-600 text-[.8em]  px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Buscar por QR
          </Button>
        </div>
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
                      items={DEVICE_LIST_OPTION}
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
      <Paginator />
      {/* Device details */}
      <Modal
        title="Detalles del dispositivo"
        isOpen={isOpenDetail}
        onClose={() => {
          setOpenDetail(false);
        }}
      >
        <div className="flex flex-row justify-between bg-white text-black">
          <div>
            <div>Cliente: {deviceDetail?.client}</div>
            <div>Dispositivo: {deviceDetail?.device}</div>
            <div>Modelo: {deviceDetail?.model}</div>
            <div className="flex gap-1 text-wrap">
              <span>Fallas: </span>
              {deviceDetail?.faults.map((f) => {
                return <p key={f.id}>{f.name},</p>;
              })}
            </div>
            <div>Esta pagado: {deviceDetail?.pay ? "Si" : "No"}</div>
            <div>Recibido: {deviceDetail?.entryDate}</div>
            <div>Esta entregado: {deviceDetail?.output}</div>
            <div>Observaciones: {deviceDetail?.detail}</div>
            <div>IMEI: {deviceDetail?.IMEI}</div>
          </div>
          <div className="self-end">
            <DropDown
              className="bg-white text-black"
              items={DEVICE_LIST_OPTION}
              title="Opciones"
              onSelect={(newStatus) =>
                newStatus === "Editar"
                  ? handlerEditDevice(deviceDetail)
                  : newStatus === "Entregado"
                  ? handleOutput(deviceDetail.id, true)
                  : newStatus === "Eliminar"
                  ? handleDeleteDevice(deviceDetail.id)
                  : null
              }
            />
          </div>
        </div>
      </Modal>

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
          onChange={handleInputChange}
          onSubmit={handleFormSubmit}
          isEditing={false}
        />
      </Modal>
      <Modal
        title="Buscar dispositivo por QR"
        isOpen={isOpenQR}
        onClose={() => setOpenQR(false)}
      >
        <ReadQR deviceSearchQR={handleDeviceSearchQR} />
      </Modal>
    </div>
  );
};

export default TechnicalService;
