import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import app from "../src/app.js";

const originalSecret = process.env.JWT_SECRET;
const TEST_SECRET = "stockalert-test-secret";

let server;
let baseUrl;

test.before(async () => {
  process.env.JWT_SECRET = TEST_SECRET;

  server = app.listen(0);

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test("GET /api/v1/products rejects requests without a token", async () => {
  const response = await fetch(`${baseUrl}/api/v1/products`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
  assert.equal(body.message, "Authentication token is required.");
});

test("GET /api/v1/products rejects an invalid token", async () => {
  const response = await fetch(`${baseUrl}/api/v1/products`, {
    headers: {
      Authorization: "Bearer invalid-token",
    },
  });

  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
  assert.equal(
    body.message,
    "Invalid or expired authentication token.",
  );
});

test("GET /api/v1/products accepts a valid token", async () => {
  const token = jwt.sign(
    { email: "test@example.com" },
    TEST_SECRET,
    {
      subject: "550e8400-e29b-41d4-a716-446655440000",
      expiresIn: "5m",
    },
  );

  const response = await fetch(`${baseUrl}/api/v1/products`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(typeof body.count, "number");
  assert.ok(Array.isArray(body.data));
});

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  if (originalSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalSecret;
  }
});