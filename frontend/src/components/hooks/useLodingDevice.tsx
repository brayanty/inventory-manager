import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { useSearchStore } from "@/components/store/filters.tsx";
import usePageStore from "@/components/store/page.tsx";
import { searchDevices } from "@/components/services/devices.js";
import { TechnicalServiceEntry } from "@/components/types/technicalService.ts";

const useLoadingDevice = () => {
  const [devices, setDevices] = useState<TechnicalServiceEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { search } = useSearchStore();
  const { page, setPage, setTotalPages } = usePageStore();

  const [debouncedSearch] = useDebounce(search, 800);

  const handleGetDevices = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await searchDevices(debouncedSearch, page);
      console.log(data.devices);
      if (data) {
        setDevices(data.devices);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error("Error al cargar dispositivos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, page, setTotalPages]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, setPage]);

  useEffect(() => {
    handleGetDevices();
  }, [handleGetDevices]);

  return { devices, setDevices, isLoading, handleGetDevices };
};
export default useLoadingDevice;
