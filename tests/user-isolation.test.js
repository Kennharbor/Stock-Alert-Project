import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import { db, pool } from "../src/db/index.js";
import { users, products } from "../src/db/schema.js";
import { eq, inArray } from "drizzle-orm";

let server;
let baseUrl;
let userA;
let userB;
let tokenA;
let tokenB;
let productA;
const createdUserIds = [];

const uniqueId = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 10)}`;

const password = "StockAlertTest123!";

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

  // Register two independent test accounts.
  const registerA = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `isolation-a-${uniqueId}@example.com`,
      password,
    }),
  });

  const registerBodyA = await registerA.json();

  assert.equal(registerA.status, 201);
  assert.equal(registerBodyA.success, true);

  userA = registerBodyA.data;
  createdUserIds.push(userA.id);

  const registerB = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `isolation-b-${uniqueId}@example.com`,
      password,
    }),
  });

  const registerBodyB = await registerB.json();

  assert.equal(registerB.status, 201);
  assert.equal(registerBodyB.success, true);

  userB = registerBodyB.data;
  createdUserIds.push(userB.id);

  // Log in as both users to obtain real JWTs.
  const loginA = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: userA.email,
      password,
    }),
  });

  const loginBodyA = await loginA.json();

  assert.equal(loginA.status, 200);
  tokenA = loginBodyA.data.token;

  const loginB = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: userB.email,
      password,
    }),
  });

  const loginBodyB = await loginB.json();

  assert.equal(loginB.status, 200);
  tokenB = loginBodyB.data.token;

  // Create one product owned by User A.
  const createProductResponse = await fetch(
    `${baseUrl}/api/v1/products`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: `Isolation Test Product ${uniqueId}`,
        sku: `ISO-${uniqueId}`,
      }),
    },
  );

  const createProductBody = await createProductResponse.json();

  assert.equal(createProductResponse.status, 201);
  productA = createProductBody.data;
});

test("User A can see their own product", async () => {
  const response = await fetch(`${baseUrl}/api/v1/products`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(body.data.some((product) => product.id === productA.id));
});

test("User B cannot see User A's product in their product list", async () => {
  const response = await fetch(`${baseUrl}/api/v1/products`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(
    body.data.some((product) => product.id === productA.id),
    false,
  );
});

test("User B cannot retrieve User A's product by ID", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/products/${productA.id}`,
    {
      headers: { Authorization: `Bearer ${tokenB}` },
    },
  );

  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, "Product not found.");
});

test("User B cannot update User A's product", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/products/${productA.id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ name: "Unauthorized Change" }),
    },
  );

  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, "Product not found.");
});

test("User B cannot delete User A's product", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/products/${productA.id}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenB}` },
    },
  );

  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, "Product not found.");
});

test.after(async () => {
  try {
    // Remove only the temporary users created by this test.
    // Foreign-key cascades remove their associated products and movements.
    if (createdUserIds.length > 0) {
      await db
        .delete(users)
        .where(inArray(users.id, createdUserIds));
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

    // Close the pool created by the imported database module.
    await pool.end();
  }
});