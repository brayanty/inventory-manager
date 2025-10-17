import { Router } from "express";
import createDevice from "../controllers/createDevice.js";
import getAllDevice from "../controllers/getAllDevice.js";

const router = Router();

//Create new device
router.post("/devices", createDevice);
//Get all device
router.get("/devices", getAllDevice);

export default router;
