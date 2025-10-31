import { useEffect, useState } from "react";
import { useSearchStore } from "@/components/store/filters.tsx";
import usePageStore from "@/components/store/page.tsx";
import { searchDevices } from "@/components/services/devices.js";
import { TechnicalServiceEntry } from "@/components/types/technicalService.ts";

const useLoadingDevice = () => {
  const [devices, setDevices] = useState<TechnicalServiceEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { search } = useSearchStore();
  const { page, setPage, setTotalPages } = usePageStore();

  useEffect(() => {
    const getDevices = async () => {
      setIsLoading(true);
      try {
        const data = await searchDevices(search, page);
        if (data) {
          setDevices(data.devices);
          setPage(data.page);
          setTotalPages(data.totalPages);
        }
      } finally {
        setIsLoading(false);
      }
    };
    getDevices();
  }, [search, page, setPage, setTotalPages]);

  return { devices, setDevices, isLoading };
};

export default useLoadingDevice;
