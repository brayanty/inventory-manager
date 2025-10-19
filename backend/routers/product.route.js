import { Router } from "express";
import { getProduct } from "../controllers/product/getProduct.js";
import { createProduct } from "../controllers/product/createProduct.js";

const router = Router();

router.get("/products", getProduct);
router.post("/products", createProduct);

export default router;
