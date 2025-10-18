import { Router } from "express";
import createDevice from "../controllers/deviceRepair/createDevice.js";
import getAllDevice from "../controllers/deviceRepair/getAllDevice.js";
import getDevice from "../controllers/deviceRepair/getDevice.js";
import updateDevice from "../controllers/deviceRepair/updateDevice.js";
import deleteDevice from "../controllers/deviceRepair/deleteDevice.js";
import getRepairs from "../controllers/deviceRepair/getRepairs.js";

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
//Get Repairs
router.get("/repairs", getRepairs);

export default router;
