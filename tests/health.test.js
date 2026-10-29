import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";

let server;
let baseUrl;

test("Start a temporary HTTP server", async () => {
  server = app.listen(0);

  await new Promise((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;

  assert.ok(address.port > 0);
});

test("GET /api/v1/health returns HTTP 200", async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.message, "StockAlert API is running.");
  assert.ok(body.timestamp);
});

test("GET /api/v1/health/db returns HTTP 200", async () => {
  const response = await fetch(`${baseUrl}/api/v1/health/db`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.message, "Database connection successful.");
});

test("Close the temporary HTTP server", async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
});