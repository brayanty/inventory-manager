import { useEffect, useRef, useState } from "react";

export const useOpenSidebar = (id: string) => {
    const ref = useRef<HTMLElement | null>(null);
    const [openSidebar, setOpenSidebar] = useState(false);

    // Alternar la visibilidad del sidebar
    const toggleSidebar = () => {
        setOpenSidebar((prev) => !prev);
    };

    // Cierra el sidebar si se hace clic fuera de él
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                ref.current &&
                !ref.current.contains(event.target as Node)
            ) {
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

    // Manejo de clases CSS para mostrar u ocultar el sidebar
    useEffect(() => {
        const sidebar = document.querySelector(id);
        if (sidebar) {
            ref.current = sidebar as HTMLElement;
            openSidebar ? 
            sidebar.classList.remove("-translate-x-[500px]") 
            :sidebar.classList.add("-translate-x-[500px]");

        }
    }, [openSidebar]);

    return [toggleSidebar]
}