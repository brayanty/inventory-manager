import { Menu, Search } from "lucide-react";
import { useCategoryListStore } from "../store/category.tsx";
import { useSearchStore } from "../store/filters.tsx";
import { useOpenSidebar } from "../hooks/openSidebar.tsx";

function Header() {
  const { categorySelect, setCategorySelect, categoryList } =
    useCategoryListStore();
  const { search, setSearch } = useSearchStore();
  const [toggleSidebar] = useOpenSidebar("#navegation");

  const categories = [{ category: "todos" }, ...categoryList];

  return (
    <header
      className="
        flex flex-wrap items-center justify-between gap-4 
        p-4 w-full
        bg-white dark:bg-[#1f232b] dark:text-white
        border-b border-gray-200 dark:border-gray-700
      "
    >
      {/* Menu Button */}
      <button
        onClick={toggleSidebar}
        className="
          flex items-center justify-center p-2 
          rounded-md border border-gray-300 dark:border-gray-600 
          bg-gray-50 dark:bg-[#2b2f38] 
          hover:bg-gray-100 dark:hover:bg-[#343840] 
          transition-colors duration-300
        "
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search Desktop */}
      <div className="hidden md:flex flex-1 justify-center w-full">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
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
      {categories.length > 0 && (
        <select
          className="
            p-2 rounded-md border capitalize
            border-gray-300 dark:border-gray-600 
            dark:bg-[#2b2f38] text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500
          "
          value={categorySelect}
          onChange={(e) => setCategorySelect(e.target.value)}
        >
          {categories.map((item, index) => (
            <option key={index} value={item.category} className="capitalize">
              {item.category}
            </option>
          ))}
        </select>
      )}

      {/* Search Mobile*/}
      <div className="flex md:hidden justify-center w-full order-last">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
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
    </header>
  );
}

export default Header;
