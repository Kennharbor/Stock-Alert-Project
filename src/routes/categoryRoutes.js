import { Router } from "express";

import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

import { validateRequest } from "../middleware/validateRequest.js";

import {
  createCategorySchema, updateCategorySchema
} from "../middleware/validateCategory.js";

const router = Router();

router.post(
  "/",
  validateRequest(createCategorySchema),
  createCategory,
);

router.get("/", getCategories);

router.get("/:id", getCategoryById);

router.patch("/:id", validateRequest(updateCategorySchema), updateCategory);

router.delete("/:id", deleteCategory);

export default router;