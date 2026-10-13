import "dotenv/config";
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON requests
app.use(express.json());

// Health-check endpoint
app.get("/api/v1/health", (req, res) => {
res.status(200).json({
success: true,
message: "StockAlert API is running.",
timestamp: new Date().toISOString(),
});
});

// Start the server
app.listen(PORT, () => {
console.log(`StockAlert API is running at http://localhost:${PORT}`);
});
