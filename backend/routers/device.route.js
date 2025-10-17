import { Router } from "express";
import createDevice from "../controllers/createDevice.js";
import getAllDevice from "../controllers/getAllDevice.js";
import getDevice from "../controllers/getDevice.js";

const router = Router();

//Create new device
router.post("/devices", createDevice);
//Get all device
router.get("/devices", getAllDevice);
//Get one device
router.get("/diveces/:id", getDevice);

export default router;
