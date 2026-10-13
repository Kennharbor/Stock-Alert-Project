import { db } from "../db/index.js";
import { products } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export async function createProduct(req, res) {
  try {
    const {
      name,
      sku,
      quantity,
      minimumStockLevel,
      unitPrice,
      categoryId,
    } = req.body;

    // Validate required fields
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof sku !== "string" ||
      !sku.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Product name and SKU are required.",
      });
    }

    // Check that the SKU is not already used by this user
    const existingProduct = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.userId, req.user.id),
          eq(products.sku, sku.trim()),
        ),
      )
      .limit(1);

    if (existingProduct.length > 0) {
      return res.status(409).json({
        success: false,
        message: "You already have a product with this SKU.",
      });
    }

    // Create the product
    const [newProduct] = await db
      .insert(products)
      .values({
        userId: req.user.id,
        name: name.trim(),
        sku: sku.trim(),
        quantity: quantity ?? 0,
        minimumStockLevel: minimumStockLevel ?? 5,
        unitPrice: unitPrice ?? null,
        categoryId: categoryId ?? null,
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: newProduct,
    });
  } catch (error) {
    console.error("Create product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create product.",
    });
  }
}