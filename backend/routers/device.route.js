import { Router } from "express";
import { createDevice } from "../controllers/deviceRepair/createDevice.controller.js";
import getAllDevice from "../controllers/deviceRepair/getAllDevice.js";
import getDevice from "../controllers/deviceRepair/getDevice.js";
import deleteDevice from "../controllers/deviceRepair/deleteDevice.js";
import getRepairs from "../controllers/deviceRepair/getRepairs.js";
import {
  validateDevice,
  validateUpdateDevice,
} from "../middleware/device.middleware.js";
import updateDevice from "../controllers/deviceRepair/updateDevice.controller.js";
import { updateStatusDevice } from "../controllers/deviceRepair/updateStatusDevice.controller.js";
import { reprintTicketDevice } from "../controllers/deviceRepair/reprintTicket.controller.js";

const router = Router();

//Create new device
router.post("/devices", validateDevice, createDevice);
//Get all device
router.get("/devices", getAllDevice);
//Get one device
router.get("/devices/:id", getDevice);
//Update device
router.put("/devices/:id", validateUpdateDevice, updateDevice);
//Delete device
router.delete("/devices/:id", deleteDevice);
//Get Repairs
router.get("/repairs", getRepairs);
//Update status output
router.put("/devices/status/:id", updateStatusDevice);
// Reprint Ticket
router.post("/devices/reprint/:id", reprintTicketDevice);

export default router;
