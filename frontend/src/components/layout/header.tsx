import { Menu } from "lucide-react";
import { useCategoryListStore } from "../store/category.tsx";
import { useSearchStore } from "../store/filters.tsx";
import { useOpenSidebar } from "../hooks/openSidebar.tsx";

function Header() {
  const { categorySelect, setCategorySelect, categoryList } =
    useCategoryListStore();
  const { search, setSearch } = useSearchStore();
  const [toggleSidebar] = useOpenSidebar("#navegation");
  return (
    <header className="mx-auto w-full h-full max-h-16 flex justify-between items-center p-5 dark:text-white bg-white dark:bg-[#1f232b]">
      <div>
        <button
          className="cursor-pointer p-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-[#2b2f38] hover:bg-gray-600 transition-colors ease-in-out duration-500 text-sm "
          onClick={toggleSidebar}
        >
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
