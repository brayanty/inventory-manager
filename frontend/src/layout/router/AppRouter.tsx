import Layout from "@/layout/Layout";
import ProductsInventory from "@/layout/pages/inventory";
import TechnicalService from "@/layout/pages/technicalService";
import SalesStatistics from "@/layout/pages/SalesStatistics";
import NotFound from "@/layout/pages/notFound"
import { Route, Routes } from "react-router";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route path="/product" element={<ProductsInventory />} />
        <Route path="/technicalservice" element={<TechnicalService />} />
        <Route path="/salesstatistics" element={<SalesStatistics />} />
        <Route path="*" element={<NotFound />}></Route>
      </Route>
    </Routes>
  );
}
