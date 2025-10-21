import { Router } from "express";
import getAllCategory from "../controllers/categories/getAllCategory.js";
import createCategory from "../controllers/categories/createCategory.js";
import deleteCategory from "../controllers/categories/deleteCategory.js";

const router = Router();

//Get all category
router.get("/category", getAllCategory);
//Create new category
router.post("/category", createCategory);
//Delete category
router.delete("/category/:id", deleteCategory);

export default router;
