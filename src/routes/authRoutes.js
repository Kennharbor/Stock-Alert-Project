import { Router } from "express";
import { register } from "../controllers/authController.js";
import { registerSchema } from "../middleware/validateAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

router.post("/register", validateRequest(registerSchema), register);

export default router;
