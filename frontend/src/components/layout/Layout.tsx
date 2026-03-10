import { Outlet } from "react-router";
import Header from "./header";
import Sidebar from "./Sidebar";
import { ShoppingCartIcon } from "lucide-react";
import { useOpenSidebar } from "../hooks/openSidebar";

export default function Layout() {
  const [toggleSidebar] = useOpenSidebar("#shopping-cart");
  return (
    <div className="h-screen max-h-screen flex flex-row">
      {/* Navegation */}
      <div
        id={"navegation"}
        className="h-screen max-h-screen absolute z-20 transition-opacity duration-300 ease-in-out opacity-0 pointer-events-none bg-[#1e1e1e] "
      >
        <Sidebar />
      </div>
      <div className="w-full flex flex-col">
        {/* Components Search and filtered */}
        <div className="w-full">
          <Header />
        </div>
        {/* Main */}
        <main className="">
          {/* Aquí se renderiza la página actual */}
          <div className="col-span-3 row-span-5">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile floating button */}
      <button
        onClick={() => toggleSidebar()}
        className="fixed bottom-4 right-4 z-50 bg-green-600 p-3 rounded-full shadow-lg"
      >
        <ShoppingCartIcon className="text-white w-5 h-5" />
      </button>
    </div>
  );
}
