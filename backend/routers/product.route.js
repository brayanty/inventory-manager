import { Router } from "express";
import { getProduct } from "../controllers/product/getProduct.js";
import { createProduct } from "../controllers/product/createProduct.js";
import { updateProduct } from "../controllers/product/updateProduct.js";
import { soldProduct } from "../controllers/product/soldProduct.js";
import { deleteProduct } from "../controllers/product/deleteProduct.js";

const router = Router();

router.get("/products", getProduct);
router.post("/products", createProduct);
router.post("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);
router.post("/soldProducts", soldProduct);

export default router;
