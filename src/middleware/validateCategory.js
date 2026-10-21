import { z } from "zod";

export const createCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Category name is required.")
      .max(100, "Category name must not exceed 100 characters."),

    description: z
      .string()
      .trim()
      .max(1000, "Description must not exceed 1000 characters.")
      .optional()
      .nullable(),
  })
  .strict();

export const updateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Category name cannot be empty.")
      .max(100, "Category name must not exceed 100 characters.")
      .optional(),

    description: z
      .string()
      .trim()
      .max(1000, "Description must not exceed 1000 characters.")
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field to update.",
  );