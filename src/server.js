import "dotenv/config";
import express from "express";
import { db, pool } from "./db/index.js";
import { sql } from "drizzle-orm";
import productRoutes from "./routes/productRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/api/v1/products", productRoutes);

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

const server = app.listen(PORT, () => {
console.log(`StockAlert API running at http://localhost:${PORT}`);
});

// Gracefully close the server and database connections
async function shutdown() {
console.log("Shutting down StockAlert API...");

server.close(async () => {
try {
await pool.end();
console.log("Database connections closed.");
process.exit(0);
} catch (error) {
console.error("Error closing database connections:", error.message);
process.exit(1);
}
});
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
