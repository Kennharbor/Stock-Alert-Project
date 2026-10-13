import { Router } from "express";
import { createProduct } from "../controllers/productController.js";

const router = Router();

router.post("/", createProduct);

export default router;