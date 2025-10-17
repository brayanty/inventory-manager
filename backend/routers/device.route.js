import { Router } from "express";
import createDevice from "../controllers/createDevice.js";
import getAllDevice from "../controllers/getAllDevice.js";
import getDevice from "../controllers/getDevice.js";
import updateDevice from "../controllers/updateDevice.js";
import deleteDevice from "../controllers/deleteDevice.js";

const router = Router();

//Create new device
router.post("/devices", createDevice);
//Get all device
router.get("/devices", getAllDevice);
//Get one device
router.get("/devices/:id", getDevice);
//Update device
router.post("/devices/:id", updateDevice);
//Delete device
router.delete("/devices/:id", deleteDevice);

export default router;
