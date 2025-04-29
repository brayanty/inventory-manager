import Product from "@/components/inventory";
import Layout from "../components/layout/Layout";
import TechnicalService from "../pages/technicalService/technicalService";
import { Route, Routes } from "react-router";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route path="/product" element={<Product />} />
        <Route path="/technicalservice" element={<TechnicalService />} />
      </Route>
    </Routes>
  );
}
