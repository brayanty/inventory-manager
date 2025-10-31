import { Menu, Search } from "lucide-react";
import { useCategoryListStore } from "../store/category.tsx";
import { useSearchStore } from "../store/filters.tsx";
import { useOpenSidebar } from "../hooks/openSidebar.tsx";

function Header() {
  const { categorySelect, setCategorySelect, categoryList } =
    useCategoryListStore();
  const { search, setSearch } = useSearchStore();
  const [toggleSidebar] = useOpenSidebar("#navegation");

  const newCategory = [{ category: "todos" }, ...categoryList];

  return (
    <header
      className="
        flex justify-between gap-4 
        p-4 w-full max-w-full
        bg-white dark:bg-[#1f232b] dark:text-white
        border-b border-gray-200 dark:border-gray-700
        sm:grid-cols-[auto_1fr_auto]
      "
    >
      {/* Botón menú */}
      <div className="flex justify-start">
        <button
          className="
            flex items-center justify-center p-2 
            rounded-md border border-gray-300 dark:border-gray-600 
            bg-gray-50 dark:bg-[#2b2f38] 
            hover:bg-gray-100 dark:hover:bg-[#343840] 
            transition-colors duration-300
          "
          onClick={() => toggleSidebar()}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Input de búsqueda */}
      <div className="flex justify-center w-full">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            id="search"
            type="text"
            placeholder="Buscar..."
            className="
              w-full pl-9 pr-3 py-2 rounded-md 
              border border-gray-300 dark:border-gray-600 
              dark:bg-[#2b2f38] text-sm 
              focus:outline-none focus:ring-2 focus:ring-blue-500
              transition-all
            "
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Selector de categoría */}
      <div className="flex justify-end max-w-fit sm:max-w-none">
        <select
          className={`
            ${newCategory.length === 0 ? "hidden" : ""}
            p-2 rounded-md border min-h-min capitalize
            border-gray-300 dark:border-gray-600 
            dark:bg-[#2b2f38] text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500
          `}
          value={categorySelect}
          onChange={(e) => setCategorySelect(e.target.value)}
        >
          {newCategory.map((item, index) => (
            <option className="capitalize" key={index} value={item.category}>
              {item.category}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}

export default Header;
