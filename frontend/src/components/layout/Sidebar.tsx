import { NavLink, useLocation, useNavigate } from "react-router";
import { IconNote, IconSmartPhone } from "./ui/imgs";
import { LucideMoreHorizontal } from "lucide-react";
import { useState } from "react";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebar, setSidebar] = useState(false);

  const handleRouter = (path: string) => {
    if (path === location.pathname) return;
    navigate(path);
  };

  const handleSidebarOpen = () => {
    setSidebar((preEven) => !preEven);
  };

  return (
    <header className="transition duration-600 ease-in-out h-full navbar">
      <div className="w-full max-md:flex justify-between pl-4 pr-4">
        <h2 className="text-xl text-center text-white font-bold mb-2">
          Navegacion
        </h2>
        <div
          className={`md:hidden transition-all ${
            isSidebar ? "rotate-90" : "-rotate-180"
          }`}
          onClick={handleSidebarOpen}
        >
          <LucideMoreHorizontal />
        </div>
      </div>
      <nav
        className={`transition-all duration-300 ease-in-out ${
          isSidebar
            ? "max-md:absolute max-md:-translate-y-[1000px]"
            : "translate-0"
        }`}
      >
        <ul className="list">
          <NavLink
            to="/product"
            className={({ isActive }) =>
              `flex items-center gap-2 p-2 rounded-md transition-colors ${
                isActive
                  ? "bg-blue-100 text-blue-600 font-semibold"
                  : "text-white hover:bg-gray-700"
              }`
            }
          >
            <IconNote />
            Productos
          </NavLink>
          <NavLink
            to="/technicalservice"
            className={({ isActive }) =>
              `flex items-center gap-2 p-2 rounded-md transition-colors ${
                isActive
                  ? "bg-blue-100 text-blue-600 font-semibold"
                  : "text-white hover:bg-gray-700"
              }`
            }
          >
            <IconSmartPhone />
            Servicio Tecnico
          </NavLink>

          <li className="">
            <a
              onClick={(e) => {
                e.preventDefault();
                handleRouter("/technicalservice");
              }}
              className="element label"
              href="/technicalservice"
            ></a>
          </li>
        </ul>
        <div className="separator" />
        <ul className="list">
          <li className="element">
            <svg
              className="lucide lucide-users-round"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeWidth={2}
              stroke="#7e8590"
              fill="none"
              viewBox="0 0 24 24"
              height={24}
              width={24}
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M18 21a8 8 0 0 0-16 0" />
              <circle r={5} cy={8} cx={10} />
              <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" />
            </svg>
            <p className="label">Tecnicos/Vendedores</p>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Sidebar;
