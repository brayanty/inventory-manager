import { useEffect, useRef, useState } from "react";

export const useOpenSidebar = (id: string) => {
  const ref = useRef<HTMLElement | null>(null);
  const [openSidebar, setOpenSidebar] = useState(false);

  const toggleSidebar = () => {
    setOpenSidebar((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpenSidebar(false);
      }
    };

    if (openSidebar) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openSidebar]);

  useEffect(() => {
    const sidebar = document.querySelector(id);
    if (sidebar) {
      ref.current = sidebar as HTMLElement;
      sidebar.classList.toggle("opacity-0", !openSidebar);
      sidebar.classList.toggle("pointer-events-none", !openSidebar);
    }
  }, [openSidebar, id]);

  return [toggleSidebar] as const;
};
