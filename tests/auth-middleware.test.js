import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { authenticateToken } from "../src/middleware/authenticateToken.js";

const originalSecret = process.env.JWT_SECRET;

test("Missing authorization header returns 401", () => {
  const req = { headers: {} };
  let statusCode;
  let responseBody;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  let nextCalled = false;

  authenticateToken(req, res, () => {
    nextCalled = true;
  });

  assert.equal(statusCode, 401);
  assert.equal(responseBody.success, false);
  assert.equal(responseBody.message, "Authentication token is required.");
  assert.equal(nextCalled, false);
});

test("Invalid token returns 401", () => {
  process.env.JWT_SECRET = "test-secret";

  const req = {
    headers: {
      authorization: "Bearer invalid-token",
    },
  };

  let statusCode;
  let responseBody;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  let nextCalled = false;

  authenticateToken(req, res, () => {
    nextCalled = true;
  });

  assert.equal(statusCode, 401);
  assert.equal(responseBody.success, false);
  assert.equal(
    responseBody.message,
    "Invalid or expired authentication token.",
  );
  assert.equal(nextCalled, false);
});

test("Valid token attaches user identity and calls next", () => {
  process.env.JWT_SECRET = "test-secret";

  const token = jwt.sign(
    { email: "test@example.com" },
    process.env.JWT_SECRET,
    { subject: "550e8400-e29b-41d4-a716-446655440000" },
  );

  const req = {
    headers: {
      authorization: `Bearer ${token}`,
    },
  };

  const res = {
    status() {
      throw new Error("A valid token should not return an error response.");
    },
    json() {
      throw new Error("A valid token should not return an error response.");
    },
  };

  let nextCalled = false;

  authenticateToken(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user.id, "550e8400-e29b-41d4-a716-446655440000");
  assert.equal(req.user.email, "test@example.com");
});

test("Authorization header using Basic scheme returns 401", () => {
const req = {
headers: {
authorization: "Basic some-credentials",
},
};

let statusCode;
let responseBody;

const res = {
status(code) {
statusCode = code;
return this;
},
json(body) {
responseBody = body;
return this;
},
};

let nextCalled = false;

authenticateToken(req, res, () => {
nextCalled = true;
});

assert.equal(statusCode, 401);
assert.equal(responseBody.success, false);
assert.equal(responseBody.message, "Authentication token is required.");
assert.equal(nextCalled, false);
});

test("Empty Bearer token returns 401", () => {
const req = {
headers: {
authorization: "Bearer ",
},
};

let statusCode;
let responseBody;

const res = {
status(code) {
statusCode = code;
return this;
},
json(body) {
responseBody = body;
return this;
},
};

let nextCalled = false;

authenticateToken(req, res, () => {
nextCalled = true;
});

assert.equal(statusCode, 401);
assert.equal(responseBody.success, false);
assert.equal(responseBody.message, "Authentication token is required.");
assert.equal(nextCalled, false);
});

test("Expired JWT returns 401", () => {
process.env.JWT_SECRET = "test-secret";

const token = jwt.sign(
{ email: "[test@example.com](mailto:test@example.com)" },
process.env.JWT_SECRET,
{
subject: "550e8400-e29b-41d4-a716-446655440000",
expiresIn: -1,
},
);

const req = {
headers: {
authorization: `Bearer ${token}`,
},
};

let statusCode;
let responseBody;

const res = {
status(code) {
statusCode = code;
return this;
},
json(body) {
responseBody = body;
return this;
},
};

let nextCalled = false;

authenticateToken(req, res, () => {
nextCalled = true;
});

assert.equal(statusCode, 401);
assert.equal(responseBody.success, false);
assert.equal(
responseBody.message,
"Invalid or expired authentication token.",
);
assert.equal(nextCalled, false);
});

test("JWT without a subject returns 401", () => {
process.env.JWT_SECRET = "test-secret";

const token = jwt.sign(
{ email: "[test@example.com](mailto:test@example.com)" },
process.env.JWT_SECRET,
);

const req = {
headers: {
authorization: `Bearer ${token}`,
},
};

let statusCode;
let responseBody;

const res = {
status(code) {
statusCode = code;
return this;
},
json(body) {
responseBody = body;
return this;
},
};

let nextCalled = false;

authenticateToken(req, res, () => {
nextCalled = true;
});

assert.equal(statusCode, 401);
assert.equal(responseBody.success, false);
assert.equal(responseBody.message, "Invalid authentication token.");
assert.equal(nextCalled, false);
});

test("JWT with a non-string subject returns 401", () => {
process.env.JWT_SECRET = "test-secret";

const token = jwt.sign(
{ email: "[test@example.com](mailto:test@example.com)", sub: 12345 },
process.env.JWT_SECRET,
);

const req = {
headers: {
authorization: `Bearer ${token}`,
},
};

let statusCode;
let responseBody;

const res = {
status(code) {
statusCode = code;
return this;
},
json(body) {
responseBody = body;
return this;
},
};

let nextCalled = false;

authenticateToken(req, res, () => {
nextCalled = true;
});

assert.equal(statusCode, 401);
assert.equal(responseBody.success, false);
assert.equal(responseBody.message, "Invalid authentication token.");
assert.equal(nextCalled, false);
});


test.after(() => {
  if (originalSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalSecret;
  }
});