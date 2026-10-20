import { Router } from "express";
import { register, login } from "../controllers/authController.js";
import { registerSchema, loginSchema } from "../middleware/validateAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

router.post("/register", validateRequest(registerSchema), register);
router.post("/login", validateRequest(loginSchema), login);

export default router;
