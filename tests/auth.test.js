import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import { db, pool } from "../src/db/index.js";
import { users } from "../src/db/schema.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const originalSecret = process.env.JWT_SECRET;
const originalExpiresIn = process.env.JWT_EXPIRES_IN;

const TEST_SECRET = "stockalert-auth-test-secret";
const TEST_PASSWORD = "StockAlertTest123!";

let server;
let baseUrl;
const testEmails = [];

function uniqueEmail() {
const email = `auth-test-${randomUUID()}@example.com`;
testEmails.push(email);
return email;
}

async function registerUser(email, password = TEST_PASSWORD) {
return fetch(`${baseUrl}/api/v1/auth/register`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ email, password }),
});
}

async function loginUser(email, password = TEST_PASSWORD) {
return fetch(`${baseUrl}/api/v1/auth/login`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ email, password }),
});
}

test.before(async () => {
process.env.JWT_SECRET = TEST_SECRET;
process.env.JWT_EXPIRES_IN = "1h";

server = app.listen(0);

await new Promise((resolve, reject) => {
server.once("listening", resolve);
server.once("error", reject);
});

baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test("Registration returns public account fields without password hash", async () => {
const email = uniqueEmail();

const response = await registerUser(email);
const body = await response.json();

assert.equal(response.status, 201);
assert.equal(body.success, true);
assert.equal(body.data.email, email);
assert.ok(body.data.id);
assert.ok(body.data.createdAt);
assert.equal("passwordHash" in body.data, false);
});

test("Registration normalizes email to lowercase", async () => {
const email = `Auth-Test-${randomUUID()}@Example.com`;
testEmails.push(email.toLowerCase());

const response = await registerUser(email);
const body = await response.json();

assert.equal(response.status, 201);
assert.equal(body.data.email, email.toLowerCase());
});

test("Registering an existing email returns 409", async () => {
const email = uniqueEmail();

const firstResponse = await registerUser(email);
assert.equal(firstResponse.status, 201);

const duplicateResponse = await registerUser(email);
const body = await duplicateResponse.json();

assert.equal(duplicateResponse.status, 409);
assert.equal(body.success, false);
assert.equal(
body.message,
"An account with this email already exists.",
);
});

test("Registration rejects passwords exceeding 72 characters", async () => {
const response = await registerUser(
uniqueEmail(),
"A".repeat(73),
);

const body = await response.json();

assert.equal(response.status, 400);
assert.equal(body.success, false);
});

test("Login with an unknown email returns 401", async () => {
const response = await loginUser(uniqueEmail());
const body = await response.json();

assert.equal(response.status, 401);
assert.equal(body.success, false);
assert.equal(body.message, "Invalid email or password.");
});

test("Login with an incorrect password returns 401", async () => {
const email = uniqueEmail();

const registerResponse = await registerUser(email);
assert.equal(registerResponse.status, 201);

const loginResponse = await loginUser(email, "WrongPassword123!");
const body = await loginResponse.json();

assert.equal(loginResponse.status, 401);
assert.equal(body.success, false);
assert.equal(body.message, "Invalid email or password.");
});

test("Successful login returns a usable Bearer token", async () => {
const email = uniqueEmail();

const registerResponse = await registerUser(email);
assert.equal(registerResponse.status, 201);

const response = await loginUser(email);
const body = await response.json();

assert.equal(response.status, 200);
assert.equal(body.success, true);
assert.equal(body.data.user.email, email);
assert.equal(body.data.tokenType, "Bearer");
assert.equal(body.data.expiresIn, "1h");
assert.ok(typeof body.data.token === "string");

const protectedResponse = await fetch(
`${baseUrl}/api/v1/products`,
{
headers: {
Authorization: `Bearer ${body.data.token}`,
},
},
);

assert.equal(protectedResponse.status, 200);
});

test.after(async () => {
try {
if (testEmails.length > 0) {
for (const email of new Set(testEmails)) {
await db.delete(users).where(eq(users.email, email));
}
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


if (originalSecret === undefined) {
  delete process.env.JWT_SECRET;
} else {
  process.env.JWT_SECRET = originalSecret;
}

if (originalExpiresIn === undefined) {
  delete process.env.JWT_EXPIRES_IN;
} else {
  process.env.JWT_EXPIRES_IN = originalExpiresIn;
}

await pool.end();

}
});
