import { db } from "../db/index.js";
import { products, categories } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { isValidUUID } from "../utils/validation.js";


export async function createProduct(req, res) {
  try {
    const {
      name,
      sku,
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

// Verify that the category belongs to the authenticated user.
if (categoryId) {
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.userId, req.user.id),
      ),
    )
    .limit(1);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found.",
    });
  }
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
        quantity: 0,
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

export async function getProducts(req, res) {
try {
const { categoryId } = req.query;


// Start by restricting results to the authenticated user.
const conditions = [eq(products.userId, req.user.id)];

// If categoryId is provided, validate it and filter by category.
if (categoryId !== undefined) {
  if (
    typeof categoryId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      categoryId,
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Category ID must be a valid UUID.",
    });
  }

  conditions.push(eq(products.categoryId, categoryId));
}

const userProducts = await db
  .select()
  .from(products)
  .where(and(...conditions));

return res.status(200).json({
  success: true,
  count: userProducts.length,
  data: userProducts,
});


} catch (error) {
console.error("Get products error:", error.message);


return res.status(500).json({
  success: false,
  message: "Unable to retrieve products.",
});


}
}


export async function getProductById(req, res) {
  const { id } = req.params;

  if (!isValidUUID(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID. A valid UUID is required.",
    });
  }

  try {
    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.userId, req.user.id),
        ),
      )
      .limit(1);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve product.",
    });
  }
}


export async function updateProduct(req, res) {
  const { id } = req.params;

  // Validate the product ID before querying the database.
  if (!isValidUUID(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID. A valid UUID is required.",
    });
  }

  try {
    const { name, sku, minimumStockLevel, unitPrice, categoryId } =
      req.body;

    // Find the product and verify ownership.
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.userId, req.user.id),
        ),
      )
      .limit(1);

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    // Verify that the category belongs to the authenticated user.
    // Allow null to remove the product's category assignment.
    if (categoryId !== undefined && categoryId !== null) {
      const [category] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, categoryId),
            eq(categories.userId, req.user.id),
          ),
        )
        .limit(1);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found.",
        });
      }
    }

    // Check SKU uniqueness if the SKU is being changed.
    if (sku !== undefined && sku !== existingProduct.sku) {
      const [duplicateSku] = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.userId, req.user.id),
            eq(products.sku, sku),
          ),
        )
        .limit(1);

      if (duplicateSku) {
        return res.status(409).json({
          success: false,
          message: "You already have a product with this SKU.",
        });
      }
    }

    // Update only the fields supplied in the request.
    const updates = {
      ...(name !== undefined && { name }),
      ...(sku !== undefined && { sku }),
      ...(minimumStockLevel !== undefined && { minimumStockLevel }),
      ...(unitPrice !== undefined && { unitPrice }),
      ...(categoryId !== undefined && { categoryId }),
      updatedAt: new Date(),
    };

    const [updatedProduct] = await db
      .update(products)
      .set(updates)
      .where(
        and(
          eq(products.id, id),
          eq(products.userId, req.user.id),
        ),
      )
      .returning();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Update product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update product.",
    });
  }
}




export async function deleteProduct(req, res) {
  const { id } = req.params;

  // Validate the product ID before querying the database.
  if (!isValidUUID(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID. A valid UUID is required.",
    });
  }

  try {
    const [deletedProduct] = await db
      .delete(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.userId, req.user.id),
        ),
      )
      .returning({
        id: products.id,
        name: products.name,
        sku: products.sku,
      });

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully.",
      data: deletedProduct,
    });
  } catch (error) {
    console.error("Delete product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete product.",
    });
  }
}

