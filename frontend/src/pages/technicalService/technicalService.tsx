import { useCategoryListStore } from "@/components/store/category";
import { useSearchStore } from "@/components/store/filters";
import { useEffect, useState } from "react";
import formatCOP from "@/components/utils/format";
import Modal from "@/components/common/Modal";
import { searchDevices } from "@/components/services/devices.js";

interface TechnicalServiceEntry {
  id: string;
  client: string;
  device: string;
  status: string;
  entryDate: string;
  exitDate: string | null;
  warrantLimit: string | null;
  price: number;
}

const TechnicalService = () => {
  const [isFormTechnical, setisFormTechnical] = useState<boolean>(false);

  const { categorySelect, setCategoryList } = useCategoryListStore();

  const { search, setSearch } = useSearchStore();
  const [formData, setFormData] = useState({
    client: "",
    device: "",
    price: 0,
  });

  const [devices, setDevices] = useState<TechnicalServiceEntry[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<
    TechnicalServiceEntry[]
  >([]);

  useEffect(() => {
    const fetchDevices = async () => {
      const devices = await searchDevices(search);
      if (devices) {
        setDevices(devices);
        setFilteredDevices(devices);
      }
    };
    fetchDevices();
    const fakeCategories = [
      { category: "Todos" },
      { category: "En reparación" },
      { category: "Reparado" },
      { category: "No reparado" },
    ];
    setCategoryList(fakeCategories);
  }, [search, setDevices]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((f) => ({
      ...f,
      [name]: name === "price" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.client.trim() ||
      !formData.device.trim() ||
      formData.price <= 0 ||
      isNaN(formData.price)
    ) {
      alert("Please fill in all fields with valid values.");
      return;
    }

    const newDevice: TechnicalServiceEntry = {
      id: Date.now().toString(),
      client: formData.client.trim(),
      device: formData.device.trim(),
      status: "En reparación",
      entryDate: new Date().toISOString().split("T")[0],
      exitDate: null,
      warrantLimit: null,
      price: formData.price,
    };

    setDevices((prev) => [...prev, newDevice]);
    setFormData({ client: "", device: "", price: 0 });
  };

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

  // Filtro aplicado a la lista de dispositivos
  useEffect(() => {
    setFilteredDevices(
      devices.filter((d) => {
        const matchesSearch =
          d.client.toLowerCase().includes(search.toLowerCase()) ||
          d.device.toLowerCase().includes(search.toLowerCase());

        const matchesStatus =
          categorySelect === "Todos" || d.status === categorySelect;

        return matchesSearch && matchesStatus;
      })
    );
  }, [categorySelect, devices, search]);

  return (
    <div className="p-4 text-white">
      <h2 className="text-xl font-bold mb-4">Servicio Técnico</h2>
      <button
        onClick={() => setisFormTechnical(true)}
        type="button"
        className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
      >
        Formulario de Ingreso
      </button>

      {/* Búsqueda y filtro */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input
          type="text"
          placeholder="Buscar por cliente o dispositivo"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-2 rounded bg-gray-700 w-full md:w-1/2"
        />
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto overflow-y-auto">
        <table className="w-full text-sm text-left text-gray-300 border-collapse">
          <thead className="bg-gray-700 text-xs uppercase">
            <tr>
              <th className="p-2">Cliente</th>
              <th className="p-2">Dispositivo</th>
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
                <td className="p-2">{formatCOP(d.price)}</td>
                <td className="p-2">{d.status ? "Reparado" : "Muerto"}</td>
                <td className="p-2">{d.entryDate}</td>
                <td className="p-2">{d.warrantLimit}</td>
                <td className="p-2">{d.exitDate || "-"}</td>
                <td className="p-2">
                  <div className="flex flex-row gap-2  items-center justify-between">
                    <button
                      onClick={() =>
                        setDevices(devices.filter((dev) => dev.id !== d.id))
                      }
                      className="bg-red-600 px-2 py-1 rounded hover:bg-red-700"
                    >
                      Eliminar
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
      {/* Formulario de ingreso */}
      <Modal
        title="Fomulario de Ingreso"
        isOpen={isFormTechnical}
        onClose={() => setisFormTechnical(false)}
      >
        <form
          onSubmit={handleAddDevice}
          className="h-full w-full text-black flex flex-col justify-center items-center gap-4"
        >
          <label className="flex flex-col" htmlFor="client">
            <span>Cliente: </span>
            <input
              type="text"
              name="client"
              id="client"
              value={formData.client}
              onChange={handleInputChange}
              placeholder="Petrolino Sinforoso"
              className="p-2 rounded"
            />
          </label>
          <label className="flex flex-col" htmlFor="device">
            <span>Dispositivo: </span>
            <input
              type="text"
              name="device"
              id="device"
              value={formData.device}
              onChange={handleInputChange}
              placeholder="Iphone 14 Pro Max"
              className="p-2 rounded"
            />
          </label>
          <label className="flex flex-col" htmlFor="Price">
            <span>Price: </span>
            <input
              type="text"
              name="price"
              id="price"
              value={formData.price}
              onChange={handleInputChange}
              className="p-2 rounded"
            />
          </label>
          <button
            type="submit"
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
