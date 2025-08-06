import ProductsInventory from "@/pages/inventory";
import Layout from "../components/layout/Layout";
import TechnicalService from "../pages/technicalService";
import { Route, Routes } from "react-router";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route path="/product" element={<ProductsInventory />} />
        <Route path="/technicalservice" element={<TechnicalService />} />
      </Route>
    </Routes>
  );
}
