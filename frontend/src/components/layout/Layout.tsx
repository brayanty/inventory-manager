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
      className="h-screen max-h-screen grid gap-2 p-2 bg-[#1e1e1e]
    grid-cols-1 grid-rows-auto
    md:grid-cols-[200px_1fr] "
    >
      {/* Navegation */}
      <div className="max-h-16 row-start-1 md:row-span-2 md:col-start-1">
        <Sidebar />
      </div>
      {/* Components Search and filtered */}
      <div className="row-start-2 md:row-start-1 md:col-start-2">
        <Header />
      </div>
      {/* Mobile floating button */}
      <button
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-green-600 p-3 rounded-full shadow-lg"
      >
        <ShoppingCartIcon className="text-white w-5 h-5" />
      </button>
      {/* Main */}
      <main className="overflow-hidden row-start-3 md:row-start-2 md:col-start-2">
        <Outlet /> {/* Aquí se renderiza la página actual */}
      </main>
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
