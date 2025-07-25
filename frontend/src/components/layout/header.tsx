import { Menu } from "lucide-react";
import { useCategoryListStore } from "../store/category.tsx";
import { useSearchStore } from "../store/filters.tsx";
import { useEffect, useRef, useState } from "react";

function Header() {
  const { categorySelect, setCategorySelect, categoryList } = useCategoryListStore();
  const { search, setSearch } = useSearchStore();

  const sidebarRef = useRef<HTMLElement | null>(null);
  const [openSidebar, setOpenSidebar] = useState(false);

  // Alternar la visibilidad del sidebar
  const toggleSidebar = () => {
    setOpenSidebar((prev) => !prev);
  };

  // Cierra el sidebar si se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
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
    const sidebar = document.querySelector("#navegation");
    if (sidebar) {
      sidebarRef.current = sidebar as HTMLElement;
      if (openSidebar) {
        sidebar.classList.remove("-translate-x-[500px]");
      } else {
        sidebar.classList.add("-translate-x-[500px]");
      }
    }
  }, [openSidebar]);

  return (
    <header className="mx-auto w-full h-full max-h-16 flex justify-between items-center p-5 dark:text-white bg-white dark:bg-[#1f232b]">
      <div>
        <button className="cursor-pointer" onClick={toggleSidebar}>
          <Menu />
        </button>
      </div>

      <label htmlFor="search">
        <input
          id="search"
          type="text"
          placeholder="Buscar..."
          className="p-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-[#2b2f38] text-sm w-60"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>

      <select
        className="p-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-[#2b2f38] text-sm"
        value={categorySelect}
        onChange={(e) => setCategorySelect(e.target.value)}
      >
        {categoryList.map((item, index) => (
          <option key={index} value={item.category}>
            {item.category}
          </option>
        ))}
      </select>
    </header>
  );
}

export default Header;
