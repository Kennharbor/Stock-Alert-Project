import { db } from "../db/index.js";
import { categories } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export async function createCategory(req, res) {
  try {
    const { name, description } = req.body;

    // Check whether this user already has a category with this name.
    const [existingCategory] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.userId, req.user.id),
          eq(categories.name, name),
        ),
      )
      .limit(1);

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "You already have a category with this name.",
      });
    }

    // Create the category for the authenticated user.
    const [newCategory] = await db
      .insert(categories)
      .values({
        userId: req.user.id,
        name,
        description: description ?? null,
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Category created successfully.",
      data: newCategory,
    });
  } catch (error) {
    console.error("Create category error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create category.",
    });
  }
}

export async function getCategories(req, res) {
  try {
    const userCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, req.user.id));

    return res.status(200).json({
      success: true,
      count: userCategories.length,
      data: userCategories,
    });
  } catch (error) {
    console.error("Get categories error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve categories.",
    });
  }
}

export async function getCategoryById(req, res) {
  try {
    const [category] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, req.params.id),
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

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Get category error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve category.",
    });
  }
}

export async function updateCategory(req, res) {
  try {
    const { name, description } = req.body;

    const [existingCategory] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, req.params.id),
          eq(categories.userId, req.user.id),
        ),
      )
      .limit(1);

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    const updatedName = name ?? existingCategory.name;

    const [duplicateCategory] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.userId, req.user.id),
          eq(categories.name, updatedName),
        ),
      )
      .limit(1);

    if (
      duplicateCategory &&
      duplicateCategory.id !== existingCategory.id
    ) {
      return res.status(409).json({
        success: false,
        message: "You already have a category with this name.",
      });
    }

    const updates = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
    };

    const [updatedCategory] = await db
      .update(categories)
      .set(updates)
      .where(
        and(
          eq(categories.id, req.params.id),
          eq(categories.userId, req.user.id),
        ),
      )
      .returning();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully.",
      data: updatedCategory,
    });
  } catch (error) {
    console.error("Update category error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update category.",
    });
  }
}

export async function deleteCategory(req, res) {
  try {
    const [deletedCategory] = await db
      .delete(categories)
      .where(
        and(
          eq(categories.id, req.params.id),
          eq(categories.userId, req.user.id),
        ),
      )
      .returning({
        id: categories.id,
        name: categories.name,
      });

    if (!deletedCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully.",
      data: deletedCategory,
    });
  } catch (error) {
    console.error("Delete category error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete category.",
    });
  }
}