import { Router } from "express";
import { createDevice } from "../controllers/createDevice.js";

const router = Router();

router.post("/devices", createDevice);

export default router;
