import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/app.js";
import { db, pool } from "../src/db/index.js";
import { users } from "../src/db/schema.js";
import { inArray } from "drizzle-orm";

let server;
let baseUrl;
let token;
let categoryId;
let productId;

const createdUserIds = [];
const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = "StockAlertTest123!";

const headers = () => ({
"Content-Type": "application/json",
Authorization: `Bearer ${token}`,
});

async function createProduct(overrides = {}) {
return fetch(`${baseUrl}/api/v1/products`, {
method: "POST",
headers: headers(),
body: JSON.stringify({
name: `Test Product ${uniqueId}`,
sku: `SKU-${uniqueId}-${Math.random().toString(36).slice(2, 7)}`,
...overrides,
}),
});
}

test.before(async () => {
assert.ok(process.env.JWT_SECRET, "JWT_SECRET must be configured.");

server = app.listen(0);

await new Promise((resolve, reject) => {
server.once("listening", resolve);
server.once("error", reject);
});

baseUrl = `http://127.0.0.1:${server.address().port}`;

// Register a dedicated test user.
const registerResponse = await fetch(`${baseUrl}/api/v1/auth/register`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
email: `products-${uniqueId}@example.com`,
password,
}),
});

const registerBody = await registerResponse.json();

assert.equal(registerResponse.status, 201);

createdUserIds.push(registerBody.data.id);

// Log in to obtain a valid JWT.
const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
email: `products-${uniqueId}@example.com`,
password,
}),
});

const loginBody = await loginResponse.json();

assert.equal(loginResponse.status, 200);

token = loginBody.data.token;

// Create a category for product tests.
const categoryResponse = await fetch(`${baseUrl}/api/v1/categories`, {
method: "POST",
headers: headers(),
body: JSON.stringify({
name: `Product Test Category ${uniqueId}`,
}),
});

const categoryBody = await categoryResponse.json();

assert.equal(categoryResponse.status, 201);

categoryId = categoryBody.data.id;
});

test("Create product successfully with default values", async () => {
const response = await createProduct({
name: "  Test Product  ",
sku: "  TEST-SKU-001  ",
});

const body = await response.json();

assert.equal(response.status, 201);
assert.equal(body.success, true);
assert.equal(body.data.name, "Test Product");
assert.equal(body.data.sku, "TEST-SKU-001");
assert.equal(body.data.quantity, 0);
assert.equal(body.data.minimumStockLevel, 5);
assert.equal(body.data.unitPrice, null);

productId = body.data.id;
});

test("Creating a product with a duplicate SKU returns 409", async () => {
const response = await createProduct({
name: "Duplicate SKU Product",
sku: "TEST-SKU-001",
});

const body = await response.json();

assert.equal(response.status, 409);
assert.equal(body.success, false);
});

test("Creating a product with an invalid category returns 404", async () => {
const response = await createProduct({
name: "Invalid Category Product",
sku: "INVALID-CATEGORY-001",
categoryId: "550e8400-e29b-41d4-a716-446655440000",
});

const body = await response.json();

assert.equal(response.status, 404);
assert.equal(body.success, false);
});

test("Creating a product with valid category and price succeeds", async () => {
const response = await createProduct({
name: "Categorized Product",
sku: "CATEGORY-SKU-001",
categoryId,
minimumStockLevel: 10,
unitPrice: 2500,
});

const body = await response.json();

assert.equal(response.status, 201);
assert.equal(body.data.categoryId, categoryId);
assert.equal(body.data.minimumStockLevel, 10);
assert.equal(Number(body.data.unitPrice), 2500);
});

test("Creating a product without a name returns 400", async () => {
const response = await fetch(`${baseUrl}/api/v1/products`, {
method: "POST",
headers: headers(),
body: JSON.stringify({
sku: "NO-NAME-001",
}),
});

assert.equal(response.status, 400);
});

test("Creating a product without an SKU returns 400", async () => {
const response = await fetch(`${baseUrl}/api/v1/products`, {
method: "POST",
headers: headers(),
body: JSON.stringify({
name: "Product Without SKU",
}),
});

assert.equal(response.status, 400);
});

test("Get products successfully returns the user's products", async () => {
const response = await fetch(`${baseUrl}/api/v1/products`, {
headers: headers(),
});

const body = await response.json();

assert.equal(response.status, 200);
assert.equal(body.success, true);
assert.ok(Array.isArray(body.data));
assert.ok(body.data.some((product) => product.id === productId));
assert.equal(body.count, body.data.length);
});

test("Get products filters by category ID", async () => {
const response = await fetch(
`${baseUrl}/api/v1/products?categoryId=${categoryId}`,
{ headers: headers() },
);

const body = await response.json();

assert.equal(response.status, 200);
assert.ok(body.data.every((product) => product.categoryId === categoryId));
});

test("Get products rejects an invalid category UUID", async () => {
const response = await fetch(
`${baseUrl}/api/v1/products?categoryId=invalid-id`,
{ headers: headers() },
);

assert.equal(response.status, 400);
});

test("Get product by ID successfully returns the product", async () => {
const response = await fetch(`${baseUrl}/api/v1/products/${productId}`, {
headers: headers(),
});

const body = await response.json();

assert.equal(response.status, 200);
assert.equal(body.success, true);
assert.equal(body.data.id, productId);
});

test("Get product rejects an invalid UUID", async () => {
const response = await fetch(`${baseUrl}/api/v1/products/invalid-id`, {
headers: headers(),
});

assert.equal(response.status, 400);
});

test("Get nonexistent product returns 404", async () => {
const response = await fetch(
`${baseUrl}/api/v1/products/550e8400-e29b-41d4-a716-446655440000`,
{ headers: headers() },
);

assert.equal(response.status, 404);
});

test("Update product successfully changes its details", async () => {
const response = await fetch(`${baseUrl}/api/v1/products/${productId}`, {
method: "PATCH",
headers: headers(),
body: JSON.stringify({
name: "Updated Test Product",
minimumStockLevel: 15,
unitPrice: 3500,
}),
});

const body = await response.json();

assert.equal(response.status, 200);
assert.equal(body.data.name, "Updated Test Product");
assert.equal(body.data.minimumStockLevel, 15);
assert.equal(Number(body.data.unitPrice), 3500);
});

test("Updating a product with an existing SKU returns 409", async () => {
const response = await fetch(`${baseUrl}/api/v1/products/${productId}`, {
method: "PATCH",
headers: headers(),
body: JSON.stringify({
sku: "CATEGORY-SKU-001",
}),
});

assert.equal(response.status, 409);
});

test("Updating a product with an invalid category returns 404", async () => {
const response = await fetch(`${baseUrl}/api/v1/products/${productId}`, {
method: "PATCH",
headers: headers(),
body: JSON.stringify({
categoryId: "550e8400-e29b-41d4-a716-446655440000",
}),
});

assert.equal(response.status, 404);
});

test("Updating a product removes its category assignment", async () => {
const response = await fetch(`${baseUrl}/api/v1/products/${productId}`, {
method: "PATCH",
headers: headers(),
body: JSON.stringify({
categoryId: null,
}),
});

const body = await response.json();

assert.equal(response.status, 200);
assert.equal(body.data.categoryId, null);
});

test("Updating a product with an empty body returns 400", async () => {
const response = await fetch(`${baseUrl}/api/v1/products/${productId}`, {
method: "PATCH",
headers: headers(),
body: JSON.stringify({}),
});

assert.equal(response.status, 400);
});

test("Updating a product with an invalid UUID returns 400", async () => {
const response = await fetch(`${baseUrl}/api/v1/products/invalid-id`, {
method: "PATCH",
headers: headers(),
body: JSON.stringify({ name: "Invalid ID Update" }),
});

assert.equal(response.status, 400);
});

test("Updating a nonexistent product returns 404", async () => {
const response = await fetch(
`${baseUrl}/api/v1/products/550e8400-e29b-41d4-a716-446655440000`,
{
method: "PATCH",
headers: headers(),
body: JSON.stringify({ name: "Missing Product" }),
},
);

assert.equal(response.status, 404);
});

test("Deleting a product with an invalid UUID returns 400", async () => {
const response = await fetch(`${baseUrl}/api/v1/products/invalid-id`, {
method: "DELETE",
headers: headers(),
});

assert.equal(response.status, 400);
});

test("Deleting a nonexistent product returns 404", async () => {
const response = await fetch(
`${baseUrl}/api/v1/products/550e8400-e29b-41d4-a716-446655440000`,
{
method: "DELETE",
headers: headers(),
},
);

assert.equal(response.status, 404);
});

test("Delete product successfully removes the product", async () => {
const response = await fetch(`${baseUrl}/api/v1/products/${productId}`, {
method: "DELETE",
headers: headers(),
});

const body = await response.json();

assert.equal(response.status, 200);
assert.equal(body.success, true);
assert.equal(body.data.id, productId);
assert.equal(body.data.name, "Updated Test Product");
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
