import { z } from "zod";

export const createProductSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Product name is required.")
      .max(150, "Product name cannot exceed 150 characters."),

    sku: z
      .string()
      .trim()
      .min(1, "SKU is required.")
      .max(100, "SKU cannot exceed 100 characters."),

    minimumStockLevel: z
      .number()
      .int("Minimum stock level must be a whole number.")
      .min(0, "Minimum stock level cannot be negative.")
      .optional()
      .default(5),

    unitPrice: z
      .number()
      .min(0, "Unit price cannot be negative.")
      .optional(),

    categoryId: z
      .uuid("Category ID must be a valid UUID.")
      .optional(),
  })
  .strict();

  export const updateProductSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Product name is required.")
      .max(150, "Product name cannot exceed 150 characters.")
      .optional(),

    sku: z
      .string()
      .trim()
      .min(1, "SKU is required.")
      .max(100, "SKU cannot exceed 100 characters.")
      .optional(),

    minimumStockLevel: z
      .number()
      .int("Minimum stock level must be a whole number.")
      .min(0, "Minimum stock level cannot be negative.")
      .optional(),

    unitPrice: z
      .number()
      .min(0, "Unit price cannot be negative.")
      .nullable()
      .optional(),

    categoryId: z
      .uuid("Category ID must be a valid UUID.")
      .nullable()
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });