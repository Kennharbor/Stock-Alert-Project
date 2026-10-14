import { Router } from "express";
import { createProduct } from "../controllers/productController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { createProductSchema } from "../middleware/validateProduct.js";

const router = Router();

router.post(
  "/",
  validateRequest(createProductSchema),
  createProduct,
);

export default router;