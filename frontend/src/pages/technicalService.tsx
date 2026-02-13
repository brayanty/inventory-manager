import React, { useEffect, useState, useMemo } from "react";
import { formatCOP } from "@/components/utils/format";
import {
  DEVICE_CATEGORY,
  DEVICES_STATUS,
  DEVICE_LIST_OPTION,
  DEVICE_SERVICE_HEADERS,
} from "@/components/constants/tecnicalService.const";
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
import { TableTitleHead } from "@/components/common/tableComponets";

const TechnicalService = () => {
  const { devices, setDevices, isLoading } = useLodingDevice();
  const { categorySelect, setCategoryList } = useCategoryListStore();

  const [isFormTechnical, setisFormTechnical] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingDeviceId, setEditingDeviceId] = useState<number | null>(null);

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
    >,
  ) => {
    const { name, value } = e.target;
    console.log(name, value);
    setDeviceForm(name, value);
  };

  const clearForm = () => {
    setDeviceFormEdit({
      client_name: "",
      device: "",
      number_phone: "",
      damage: "",
      detail: "",
      model: "",
      imei: "",
      price: 0,
      faults: [],
      pay: false,
      price_pay: 0,
    });
    setisFormTechnical(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    const newPrice = Number(deviceForm.price);
    const newNumberPhone = deviceForm.number_phone.split("-").join("");

    e.preventDefault();
    if (
      !deviceForm.client_name.trim() ||
      !deviceForm.device.trim() ||
      !deviceForm.model ||
      newPrice <= 0
    ) {
      toast.warning(
        "Verifica los campos: cliente, dispositivo, modelo, precio.",
      );
      return;
    }

    const deviceData = {
      client_name: deviceForm.client_name.trim(),
      device: deviceForm.device.trim(),
      model: deviceForm.model,
      imei: deviceForm.imei || "000000000000000",
      number_phone: newNumberPhone,
      price: newPrice,
      price_pay: Number(deviceForm.price_pay) || 0,
      detail: deviceForm.detail,
      faults: deviceForm.faults,
    };

    try {
      if (isEditing && editingDeviceId) {
        await updateDevice(editingDeviceId, deviceData);
        setDevices((prev) =>
          prev.map((d) =>
            d.id === editingDeviceId
              ? (deviceData as TechnicalServiceEntry)
              : d,
          ),
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

  const handleOutput = async (id: string, output_status: boolean) => {
    const newUpdatedDevice = devices.find((dev) => dev.id === id);

    if (!newUpdatedDevice) return;
    if (output_status && newUpdatedDevice.output_status) {
      toast.warning("El dispositivo ya está entregado.");
      return;
    }
    if (newUpdatedDevice.repair_status == "En Revisión") {
      toast.warning("Hey!!, todavia no se a revisado el dispositivo.");
      return;
    }

    const warrantLimit = new Date();
    warrantLimit.setDate(warrantLimit.getDate() + 30);

    const newDevice = {
      ...newUpdatedDevice,
      output_status: output_status,
      exitDate: output_status ? new Date().toISOString().split("T")[0] : null,
      warrantLimit:
        newUpdatedDevice.repair_status === "Reparado"
          ? warrantLimit.toISOString().split("T")[0]
          : null,
    };
    try {
      await updateDevice(id, newDevice);
      setDevices((prev) =>
        prev.map((dev) => (dev.id === id ? newDevice : dev)),
      );
      toast.success("Dispositivo actualizado correctamente.");
    } catch (error) {
      console.error("Failed to update device output:", error);
      toast.warning("Fallo a actualizar el dispositivo. Intente de nuevo.");
    }
  };

  const handleStatusChange = async (
    id: string,
    output_status: boolean,
    repair_status: TechnicalServiceEntry["repair_status"],
  ) => {
    if (output_status) {
      toast.warning(
        "No se puede cambiar el estado de un dispositivo entregado.",
      );
      return;
    }

    const updatedDevice = devices.find((dev) => dev.id === id);
    if (!updatedDevice) return;

    const newDevice = {
      ...updatedDevice,
      repair_status,
      output_status:
        repair_status === "En Revisión" ? false : updatedDevice.output_status,
    };

    try {
      await updateDevice(id, {
        repair_status,
        output_status: newDevice.output_status,
      });
      setDevices((prev) =>
        prev.map((dev) => (dev.id === id ? newDevice : dev)),
      );
    } catch (error) {
      console.error("Failed to update device status:", error);
      toast.warning("Fallo a actualizar el estado. Intente de nuevo.");
    }
  };

  const handlerEditDevice = (d: TechnicalServiceEntry) => {
    if (d.output_status) {
      toast.warning("No se puede editar un dispositivo entregado.");
      return;
    }

    setDeviceFormEdit({
      client_name: d.client_name,
      device: d.device,
      number_phone: d.number_phone,
      damage: d.damage,
      model: d.model,
      imei: d.imei,
      price: d.price,
      detail: d.detail || "",
      faults: d.faults,
      pay: d.pay,
      price_pay: d.price_pay || 0,
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
      return device.repair_status === categorySelect;
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
              <TableTitleHead itemsTitle={DEVICE_SERVICE_HEADERS} />
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
                  <td className="p-2">{d.client_name}</td>
                  <td className="p-2">{d.device}</td>
                  <td className="p-2">{d.imei}</td>
                  <td className="p-2">{formatCOP(d.price)}</td>
                  <td className="p-2">
                    <DropDown
                      items={DEVICES_STATUS}
                      select={d.repair_status}
                      onSelect={(newStatus) =>
                        handleStatusChange(
                          d.id,
                          d.output_status,
                          newStatus as TechnicalServiceEntry["repair_status"],
                        )
                      }
                    />
                  </td>
                  <td className="p-2">{d.entry_date}</td>
                  <td className="p-2">{d.warrant_limit || "-"}</td>
                  <td className="p-2">{d.output_status ? "Si" : "No"}</td>
                  <td className="p-2">{d.exit_date || "-"}</td>
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
            <div>Cliente: {deviceDetail?.client_name}</div>
            <div>Dispositivo: {deviceDetail?.device}</div>
            <div>Modelo: {deviceDetail?.model}</div>
            <div className="flex gap-1 text-wrap">
              <span>Fallas: </span>
              {deviceDetail?.faults.map((f) => {
                return <p key={f.id}>{f.name},</p>;
              })}
            </div>
            <div>Esta pagado: {deviceDetail?.pay ? "Si" : "No"}</div>
            <div>Recibido: {deviceDetail?.entry_date}</div>
            <div>
              Esta entregado: {deviceDetail?.output_status ? "Si" : "No"}
            </div>
            <div>Observaciones: {deviceDetail?.detail}</div>
            <div>IMEI: {deviceDetail?.imei}</div>
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
          isEditing={isEditing}
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
