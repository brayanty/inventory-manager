import { Router } from "express";
import { getProduct } from "../controllers/product/getProduct.js";
import { createProduct } from "../controllers/product/createProduct.js";
import { updateProduct } from "../controllers/product/updateProduct.js";

const router = Router();

router.get("/products", getProduct);
router.post("/products", createProduct);
router.post("/products/:id", updateProduct);

export default router;
