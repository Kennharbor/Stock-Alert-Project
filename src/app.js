import express from "express";
import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { authenticateToken } from "./middleware/authenticateToken.js";

const app = express();

app.use(express.json());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/products", authenticateToken, productRoutes);
app.use("/api/v1/categories", authenticateToken, categoryRoutes);

// Basic API health check
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "StockAlert API is running.",
    timestamp: new Date().toISOString(),
  });
});

// Database connection check
app.get("/api/v1/health/db", async (req, res) => {
  try {
    await db.execute(sql`SELECT 1`);

    res.status(200).json({
      success: true,
      message: "Database connection successful.",
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);

    res.status(503).json({
      success: false,
      message: "Database connection unavailable.",
    });
  }
});

export default app;