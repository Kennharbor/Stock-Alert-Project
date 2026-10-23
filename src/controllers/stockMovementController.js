import { db } from "../db/index.js";
import { products, stockMovements } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { isValidUUID } from "../utils/validation.js";

export async function recordStockMovement(req, res) {
  const { productId } = req.params;
  const { type, quantity, note } = req.body;
  const userId = req.user.id;

  if (!isValidUUID(productId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID. A valid UUID is required.",
    });
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Find the product belonging to the authenticated user.
      // Lock the row to prevent simultaneous stock changes from
      // overwriting one another.
      const [product] = await tx
        .select()
        .from(products)
        .where(
          and(
            eq(products.id, productId),
            eq(products.userId, userId),
          ),
        )
        .for("update");

      if (!product) {
        return { error: "PRODUCT_NOT_FOUND" };
      }

      // Calculate the new stock quantity.
      let resultingStock;

      if (type === "STOCK_IN") {
        resultingStock = product.quantity + quantity;
      } else {
        if (quantity > product.quantity) {
          return {
            error: "INSUFFICIENT_STOCK",
            availableStock: product.quantity,
          };
        }

        resultingStock = product.quantity - quantity;
      }

      // Update the product's stock.
      await tx
        .update(products)
        .set({
          quantity: resultingStock,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(products.id, productId),
            eq(products.userId, userId),
          ),
        );

      // Record the movement in the stock history.
      const [movement] = await tx
        .insert(stockMovements)
        .values({
          userId,
          productId,
          type,
          quantity,
          note: note ?? null,
        })
        .returning();

      return {
        movement,
        resultingStock,
      };
    });

    // Respond after the transaction completes.
    if (result.error === "PRODUCT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    if (result.error === "INSUFFICIENT_STOCK") {
      return res.status(409).json({
        success: false,
        message: "Insufficient stock for this operation.",
        availableStock: result.availableStock,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Stock movement recorded successfully.",
      data: {
        ...result.movement,
        resultingStock: result.resultingStock,
      },
    });
  } catch (error) {
    console.error("Error recording stock movement:", error);

    return res.status(500).json({
      success: false,
      message: "An error occurred while recording the stock movement.",
    });
  }
}

export async function getStockMovements(req, res) {
  const { productId } = req.params;
  const userId = req.user.id;

  if (!isValidUUID(productId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID. A valid UUID is required.",
    });
  }

  try {
    // Confirm that the product belongs to the authenticated user.
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.userId, userId),
        ),
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    // Retrieve this product's movement history, newest first.
    const movements = await db
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.productId, productId),
          eq(stockMovements.userId, userId),
        ),
      )
      .orderBy(desc(stockMovements.createdAt));

    return res.status(200).json({
      success: true,
      count: movements.length,
      data: movements,
    });
  } catch (error) {
    console.error("Error retrieving stock movements:", error);

    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving stock movements.",
    });
  }
}