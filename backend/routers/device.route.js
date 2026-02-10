import { Router } from "express";
import createDevice from "../controllers/deviceRepair/createDevice.js";
import getAllDevice from "../controllers/deviceRepair/getAllDevice.js";
import getDevice from "../controllers/deviceRepair/getDevice.js";
import updateDevice from "../controllers/deviceRepair/updateDevice.js";
import deleteDevice from "../controllers/deviceRepair/deleteDevice.js";
import getRepairs from "../controllers/deviceRepair/getRepairs.js";
import { validateDevice } from "../middleware/createDevice.middleware.js";

const router = Router();

//Create new device
router.post("/devices", validateDevice, createDevice);
//Get all device
router.get("/devices", getAllDevice);
//Get one device
router.get("/devices/:id", getDevice);
//Update device
router.put("/devices/:id", updateDevice);
//Delete device
router.delete("/devices/:id", deleteDevice);
//Get Repairs
router.get("/repairs", getRepairs);

export default router;
