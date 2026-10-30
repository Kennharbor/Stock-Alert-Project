import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import { db, pool } from "../src/db/index.js";
import { users } from "../src/db/schema.js";
import { inArray } from "drizzle-orm";

let server;
let baseUrl;
let userId;
let token;
let productId;

const createdUserIds = [];
const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const password = "StockAlertTest123!";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

test.before(async () => {
  assert.ok(
    process.env.JWT_SECRET,
    "JWT_SECRET must be configured in the environment.",
  );

  server = app.listen(0);

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // Register a temporary test user.
  const registerResponse = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `stock-movement-${uniqueId}@example.com`,
      password,
    }),
  });

  const registerBody = await registerResponse.json();

  assert.equal(registerResponse.status, 201);
  assert.equal(registerBody.success, true);

  userId = registerBody.data.id;
  createdUserIds.push(userId);

  // Log in to obtain a real JWT.
  const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: registerBody.data.email,
      password,
    }),
  });

  const loginBody = await loginResponse.json();

  assert.equal(loginResponse.status, 200);
  token = loginBody.data.token;

  // Create a product whose starting quantity is zero.
  const productResponse = await fetch(`${baseUrl}/api/v1/products`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      name: `Stock Movement Test Product ${uniqueId}`,
      sku: `SM-${uniqueId}`,
    }),
  });

  const productBody = await productResponse.json();

  assert.equal(productResponse.status, 201);
  productId = productBody.data.id;
  assert.equal(productBody.data.quantity, 0);
});

test("STOCK_IN increases the product quantity and records the movement", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/products/${productId}/stock-movements`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        type: "STOCK_IN",
        quantity: 20,
        note: "Initial stock delivery",
      }),
    },
  );

  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.data.type, "STOCK_IN");
  assert.equal(body.data.quantity, 20);
  assert.equal(body.data.note, "Initial stock delivery");
  assert.equal(body.data.resultingStock, 20);
});

test("STOCK_OUT decreases the product quantity and records the movement", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/products/${productId}/stock-movements`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        type: "STOCK_OUT",
        quantity: 5,
        note: "Items sold",
      }),
    },
  );

  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.data.type, "STOCK_OUT");
  assert.equal(body.data.quantity, 5);
  assert.equal(body.data.resultingStock, 15);
});

test("STOCK_OUT rejects quantities greater than available stock", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/products/${productId}/stock-movements`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        type: "STOCK_OUT",
        quantity: 16,
      }),
    },
  );

  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.success, false);
  assert.equal(body.availableStock, 15);
});

test("A failed stock withdrawal does not change the product quantity", async () => {
  const response = await fetch(`${baseUrl}/api/v1/products/${productId}`, {
    headers: authHeaders(),
  });

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.quantity, 15);
});

test("Invalid product UUID returns 400", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/products/not-a-uuid/stock-movements`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        type: "STOCK_IN",
        quantity: 1,
      }),
    },
  );

  assert.equal(response.status, 400);
});

test("A nonexistent product returns 404", async () => {
  const nonexistentProductId = "00000000-0000-4000-8000-000000000000";

  const response = await fetch(
    `${baseUrl}/api/v1/products/${nonexistentProductId}/stock-movements`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        type: "STOCK_IN",
        quantity: 1,
      }),
    },
  );

  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, "Product not found.");
});

test("Invalid stock movement type returns 400", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/products/${productId}/stock-movements`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        type: "TRANSFER",
        quantity: 1,
      }),
    },
  );

  assert.equal(response.status, 400);
});

test("Zero and negative quantities return 400", async (t) => {
  for (const quantity of [0, -1]) {
    await t.test(`quantity ${quantity} is rejected`, async () => {
      const response = await fetch(
        `${baseUrl}/api/v1/products/${productId}/stock-movements`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            type: "STOCK_IN",
            quantity,
          }),
        },
      );

      assert.equal(response.status, 400);
    });
  }
});

test("Movement history returns the recorded movements", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/products/${productId}/stock-movements`,
    { headers: authHeaders() },
  );

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.count, 2);
  assert.equal(body.data.length, 2);

  assert.ok(
    body.data.some(
      (movement) =>
        movement.type === "STOCK_IN" && movement.quantity === 20,
    ),
  );

  assert.ok(
    body.data.some(
      (movement) =>
        movement.type === "STOCK_OUT" && movement.quantity === 5,
    ),
  );
});

test("Movement history for an invalid product UUID returns 400", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/products/invalid-id/stock-movements`,
    { headers: authHeaders() },
  );

  assert.equal(response.status, 400);
});

test.after(async () => {
  try {
    // Deleting the test user also removes related test data via foreign keys.
    if (createdUserIds.length > 0) {
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
  } finally {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    await pool.end();
  }
});

