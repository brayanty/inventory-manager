import { Router } from "express";
import { getProduct } from "../controllers/product/getProduct.js";
import { getProductById } from "../controllers/product/getProductById.js";
import { createProduct } from "../controllers/product/createProduct.js";
import { updateProduct } from "../controllers/product/updateProduct.js";
import { soldProduct } from "../controllers/product/soldProduct.js";
import { deleteProduct } from "../controllers/product/deleteProduct.js";
import { getSoldProduct } from "../controllers/product/getSoldProduct.js";
import { getTopSold } from "../controllers/product/getTopSold.js";
import { getDailySales } from "../controllers/product/getDailySales.js";
import { getMonthlySales } from "../controllers/product/getMonthlySales.js";

const router = Router();

router.get("/products", getProduct);
router.get("/products/:id", getProductById);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);
router.post("/soldProducts", soldProduct);
router.get("/soldProducts", getSoldProduct);
router.get("/getTopSold", getTopSold);
router.get("/dailySales", getDailySales);
router.get("/monthlySales", getMonthlySales);

export default router;
