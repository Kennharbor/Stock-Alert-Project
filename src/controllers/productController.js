import { db } from "../db/index.js";
import { products } from "../db/schema.js";

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

    // Check required fields
    if (!name || !sku) {
      return res.status(400).json({
        success: false,
        message: "Product name and SKU are required.",
      });
    }

    // Save the product to the database
    const [newProduct] = await db
      .insert(products)
      .values({
        userId: req.user.id,
        name,
        sku,
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