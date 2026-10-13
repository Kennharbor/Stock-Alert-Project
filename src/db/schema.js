import {
pgTable,
pgEnum,
uuid,
varchar,
text,
integer,
decimal,
timestamp,
} from "drizzle-orm/pg-core";

// Users who own their shop data
export const users = pgTable("users", {
id: uuid("id").defaultRandom().primaryKey(),
email: varchar("email", { length: 255 }).notNull().unique(),
passwordHash: text("password_hash").notNull(),
createdAt: timestamp("created_at", { withTimezone: true })
.defaultNow()
.notNull(),
updatedAt: timestamp("updated_at", { withTimezone: true })
.defaultNow()
.notNull(),
});

// Product categories
export const categories = pgTable("categories", {
id: uuid("id").defaultRandom().primaryKey(),
userId: uuid("user_id")
.notNull()
.references(() => users.id, { onDelete: "cascade" }),
name: varchar("name", { length: 100 }).notNull(),
description: text("description"),
createdAt: timestamp("created_at", { withTimezone: true })
.defaultNow()
.notNull(),
});

// Products
export const products = pgTable("products", {
id: uuid("id").defaultRandom().primaryKey(),
userId: uuid("user_id")
.notNull()
.references(() => users.id, { onDelete: "cascade" }),
categoryId: uuid("category_id").references(() => categories.id, {
onDelete: "set null",
}),
name: varchar("name", { length: 150 }).notNull(),
sku: varchar("sku", { length: 100 }).notNull(),
quantity: integer("quantity").notNull().default(0),
minimumStockLevel: integer("minimum_stock_level")
.notNull()
.default(5),
unitPrice: decimal("unit_price", {
precision: 12,
scale: 2,
}),
createdAt: timestamp("created_at", { withTimezone: true })
.defaultNow()
.notNull(),
updatedAt: timestamp("updated_at", { withTimezone: true })
.defaultNow()
.notNull(),
});

// Stock movement types
export const stockMovementType = pgEnum("stock_movement_type", [
"STOCK_IN",
"STOCK_OUT",
]);

// Records of stock entering or leaving the shop
export const stockMovements = pgTable("stock_movements", {
id: uuid("id").defaultRandom().primaryKey(),
userId: uuid("user_id")
.notNull()
.references(() => users.id, { onDelete: "cascade" }),
productId: uuid("product_id")
.notNull()
.references(() => products.id, { onDelete: "cascade" }),
type: stockMovementType("type").notNull(),
quantity: integer("quantity").notNull(),
note: text("note"),
createdAt: timestamp("created_at", { withTimezone: true })
.defaultNow()
.notNull(),
});
