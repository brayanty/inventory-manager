import { Router } from "express";
import { getProduct } from "../controllers/product/getProduct.js";

const router = Router();

router.get("/products", getProduct);

export default router;
