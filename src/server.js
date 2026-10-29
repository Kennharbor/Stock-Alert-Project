import "dotenv/config";
import app from "./app.js";
import { pool } from "./db/index.js";

const PORT = process.env.PORT || 3000;

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