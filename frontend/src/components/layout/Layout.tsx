import { Outlet } from "react-router";
import Header from "./header";
import Sidebar from "./Sidebar";
import ShoppingCart from "../common/shoppingCart";
import { ShoppingCartIcon, X } from "lucide-react";
import { useState } from "react";
import Button from "../common/button";

export default function Layout() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <div
      className="h-screen max-h-screen flex flex-row"
    >
      {/* Navegation */}
      <div  id="navegation" className="z-50 transition-all absolute h-full -translate-x-[500px]">
        <Sidebar />
      </div>
      <div className="w-full flex flex-col">

        {/* Components Search and filtered */}
        <div className="w-full">
          <Header/>
        </div>
        {/* Main */}
        <main className="h-full">
          <Outlet /> {/* Aquí se renderiza la página actual */}
        </main>
      </div>

      {/* Mobile floating button */}
      <button
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-green-600 p-3 rounded-full shadow-lg"
      >
        <ShoppingCartIcon className="text-white w-5 h-5" />
      </button>
      {/* Mobile slide-in cart */}
      <div
        className={`fixed top-0 right-0 h-full w-4/5 max-w-sm bg-[rgba(36,40,50,1)] z-50 transform transition-transform duration-300 ease-in-out
      ${isCartOpen ? "translate-x-0" : "translate-x-full"}
      `}
      >
        {/* Close button */}
        <div className="absolute flex top-4 right-4 z-50 text-white">
          <Button
            className="bg-gray-500 hover:bg-red-600"
            onClick={() => setIsCartOpen(false)}
          >
            Salir
            <X />
          </Button>
        </div>
        <ShoppingCart />
      </div>

      {/* Backdrop when cart is open */}
      {isCartOpen && (
        <div
          onClick={() => setIsCartOpen(false)}
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
        />
      )}
    </div>
  );
}
