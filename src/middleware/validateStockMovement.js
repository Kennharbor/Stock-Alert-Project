import { z } from "zod";

export const stockMovementSchema = z
  .object({
    type: z.enum(["STOCK_IN", "STOCK_OUT"], {
      error: "Type must be STOCK_IN or STOCK_OUT.",
    }),

    quantity: z
      .number()
      .int("Quantity must be a whole number.")
      .positive("Quantity must be greater than zero."),

    note: z
      .string()
      .trim()
      .max(500, "Note must not exceed 500 characters.")
      .nullable()
      .optional(),
  })
  .strict();