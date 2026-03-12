import { Outlet } from "react-router";
import Header from "./header";
import Sidebar from "./Sidebar";
import { ShoppingCartIcon } from "lucide-react";

export default function Layout() {
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
    </div>
  );
}
