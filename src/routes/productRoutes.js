import { Router } from "express";
import { createProduct, getProducts, getProductById, updateProduct, deleteProduct, } from "../controllers/productController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { createProductSchema, updateProductSchema, } from "../middleware/validateProduct.js";

const router = Router();

router.post(
  "/",
  validateRequest(createProductSchema),
  createProduct,
);
router.get("/", getProducts);
router.get("/:id", getProductById);
router.patch(
  "/:id",
  validateRequest(updateProductSchema),
  updateProduct,
);
router.delete("/:id", deleteProduct);

export default router;