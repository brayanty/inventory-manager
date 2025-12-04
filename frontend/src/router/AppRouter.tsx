import Layout from "@/components/layout/Layout";
import ProductsInventory from "@/pages/inventory";
import TechnicalService from "@/pages/technicalService";
import SalesStatistics from "@/pages/SalesStatistics.tsx";
import { Route, Routes } from "react-router";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route path="/product" element={<ProductsInventory />} />
        <Route path="/technicalservice" element={<TechnicalService />} />
        <Route path="/salesstatistics" element={<SalesStatistics />} />
      </Route>
    </Routes>
  );
}
