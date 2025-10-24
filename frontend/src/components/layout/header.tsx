import { Menu } from "lucide-react";
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
    <header className="mx-auto w-full h-full max-h-16 flex justify-between items-center p-5 dark:text-white bg-white dark:bg-[#1f232b]">
      <div>
        <button
          className="cursor-pointer p-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-[#2b2f38] hover:bg-gray-600 transition-colors ease-in-out duration-500 text-sm "
          onClick={() => toggleSidebar()}
        >
          <Menu />
        </button>
      </div>

      <label htmlFor="search">
        <input
          id="search"
          type="text"
          placeholder="Buscar..."
          className="p-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-[#2b2f38] text-sm sm:w-30 max-md:w-50 w-60 md:w-80 lg:w-96"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div className="">
        <select
          className={`${
            newCategory.length == 0 ? "hidden" : ""
          } p-2 rounded-md border capitalize border-gray-300 dark:border-gray-600 dark:bg-[#2b2f38] text-sm`}
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
