import { Router } from "express";

import {
  createCategory,
  getCategories,
} from "../controllers/categoryController.js";

import { validateRequest } from "../middleware/validateRequest.js";

import {
  createCategorySchema,
} from "../middleware/validateCategory.js";

const router = Router();

router.post(
  "/",
  validateRequest(createCategorySchema),
  createCategory,
);

router.get("/", getCategories);

export default router;