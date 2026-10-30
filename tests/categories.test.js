import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import { db, pool } from "../src/db/index.js";
import { users, products } from "../src/db/schema.js";
import { eq, inArray } from "drizzle-orm";

let server;
let baseUrl;
let tokenA;
let tokenB;
let userA;
let categoryA;
let categoryB;
let productA;

const createdUserIds = [];
const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const password = "StockAlertTest123!";

const authHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

test.before(async () => {
  assert.ok(process.env.JWT_SECRET);

  server = app.listen(0);

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // Register two independent test users.
  for (const label of ["A", "B"]) {
    const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `category-${label}-${uniqueId}@example.com`,
        password,
      }),
    });

    const body = await response.json();

    assert.equal(response.status, 201);
    createdUserIds.push(body.data.id);

    if (label === "A") userA = body.data;
  }

  // Log in both users.
  const loginA = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: userA.email,
      password,
    }),
  });

  tokenA = (await loginA.json()).data.token;

  const loginB = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `category-B-${uniqueId}@example.com`,
      password,
    }),
  });

  tokenB = (await loginB.json()).data.token;

  assert.ok(tokenA);
  assert.ok(tokenB);

  // Create two categories belonging to User A.
  const responseA = await fetch(`${baseUrl}/api/v1/categories`, {
    method: "POST",
    headers: authHeaders(tokenA),
    body: JSON.stringify({
      name: `Electronics-${uniqueId}`,
      description: "Electronic products",
    }),
  });

  const bodyA = await responseA.json();

  assert.equal(responseA.status, 201);
  categoryA = bodyA.data;

  const responseB = await fetch(`${baseUrl}/api/v1/categories`, {
    method: "POST",
    headers: authHeaders(tokenA),
    body: JSON.stringify({
      name: `Office-${uniqueId}`,
      description: "Office supplies",
    }),
  });

  const bodyB = await responseB.json();

  assert.equal(responseB.status, 201);
  categoryB = bodyB.data;

  // Create a product linked to the first category.
  const productResponse = await fetch(`${baseUrl}/api/v1/products`, {
    method: "POST",
    headers: authHeaders(tokenA),
    body: JSON.stringify({
      name: `Category Test Product ${uniqueId}`,
      sku: `CAT-${uniqueId}`,
      categoryId: categoryA.id,
    }),
  });

  const productBody = await productResponse.json();

  assert.equal(productResponse.status, 201);
  productA = productBody.data;
});

test("Create category returns 201", async () => {
  const response = await fetch(`${baseUrl}/api/v1/categories`, {
    method: "POST",
    headers: authHeaders(tokenA),
    body: JSON.stringify({
      name: `New Category-${uniqueId}`,
      description: "Test description",
    }),
  });

  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.data.name, `New Category-${uniqueId}`);
});

test("Creating a duplicate category returns 409", async () => {
  const response = await fetch(`${baseUrl}/api/v1/categories`, {
    method: "POST",
    headers: authHeaders(tokenA),
    body: JSON.stringify({
      name: categoryA.name,
    }),
  });

  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.success, false);
});

test("Invalid category creation data returns 400", async () => {
  const response = await fetch(`${baseUrl}/api/v1/categories`, {
    method: "POST",
    headers: authHeaders(tokenA),
    body: JSON.stringify({
      name: "   ",
    }),
  });

  assert.equal(response.status, 400);
});

test("Get categories returns only the authenticated user's categories", async () => {
  const response = await fetch(`${baseUrl}/api/v1/categories`, {
    headers: authHeaders(tokenA),
  });

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.ok(body.count >= 2);

  assert.ok(body.data.some((category) => category.id === categoryA.id));
  assert.ok(body.data.some((category) => category.id === categoryB.id));
});

test("Get category by ID returns the category", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/categories/${categoryA.id}`,
    { headers: authHeaders(tokenA) },
  );

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.id, categoryA.id);
});

test("Invalid category UUID returns 400", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/categories/invalid-id`,
    { headers: authHeaders(tokenA) },
  );

  assert.equal(response.status, 400);
});

test("Nonexistent category returns 404", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/categories/00000000-0000-4000-8000-000000000000`,
    { headers: authHeaders(tokenA) },
  );

  assert.equal(response.status, 404);
});

test("Update category successfully changes its details", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/categories/${categoryA.id}`,
    {
      method: "PATCH",
      headers: authHeaders(tokenA),
      body: JSON.stringify({
        name: `Updated-${uniqueId}`,
        description: "Updated description",
      }),
    },
  );

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.name, `Updated-${uniqueId}`);
  assert.equal(body.data.description, "Updated description");
});

test("Updating a category to an existing name returns 409", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/categories/${categoryA.id}`,
    {
      method: "PATCH",
      headers: authHeaders(tokenA),
      body: JSON.stringify({
        name: categoryB.name,
      }),
    },
  );

  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.success, false);
});

test("Updating a category with an empty body returns 400", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/categories/${categoryA.id}`,
    {
      method: "PATCH",
      headers: authHeaders(tokenA),
      body: JSON.stringify({}),
    },
  );

  assert.equal(response.status, 400);
});

test("User B cannot retrieve User A's category", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/categories/${categoryA.id}`,
    { headers: authHeaders(tokenB) },
  );

  assert.equal(response.status, 404);
});

test("User B cannot update User A's category", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/categories/${categoryA.id}`,
    {
      method: "PATCH",
      headers: authHeaders(tokenB),
      body: JSON.stringify({ name: "Unauthorized Update" }),
    },
  );

  assert.equal(response.status, 404);
});

test("User B cannot delete User A's category", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/categories/${categoryA.id}`,
    {
      method: "DELETE",
      headers: authHeaders(tokenB),
    },
  );

  assert.equal(response.status, 404);
});

test("Delete category successfully removes it", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/categories/${categoryA.id}`,
    {
      method: "DELETE",
      headers: authHeaders(tokenA),
    },
  );

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.id, categoryA.id);

  // Confirm that the associated product remains but loses its category.
  const [remainingProduct] = await db
    .select()
    .from(products)
    .where(eq(products.id, productA.id));

  assert.ok(remainingProduct);
  assert.equal(remainingProduct.categoryId, null);
});

test("Deleting an already deleted category returns 404", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/categories/${categoryA.id}`,
    {
      method: "DELETE",
      headers: authHeaders(tokenA),
    },
  );

  assert.equal(response.status, 404);
});

test.after(async () => {
  try {
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

    await pool.end();
  }
});