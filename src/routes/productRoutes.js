import { Router } from "express";
import { createProduct, getProducts, getProductById, updateProduct, deleteProduct, } from "../controllers/productController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { createProductSchema, updateProductSchema, } from "../middleware/validateProduct.js";
import {
  recordStockMovement,
  getStockMovements,
} from "../controllers/stockMovementController.js";

import { stockMovementSchema } from "../middleware/validateStockMovement.js";

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

// Record stock entering or leaving a product.
router.post(
  "/:productId/stock-movements",
  validateRequest(stockMovementSchema),
  recordStockMovement,
);

// Retrieve a product's stock movement history.
router.get(
  "/:productId/stock-movements",
  getStockMovements,
);

export default router;