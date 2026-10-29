import test from "node:test";
import assert from "node:assert/strict";

import { isValidUUID } from "../src/utils/validation.js";

test("returns true for a valid UUID", () => {
  assert.equal(
    isValidUUID("550e8400-e29b-41d4-a716-446655440000"),
    true
  );
});

test("returns false for a malformed UUID", () => {
  assert.equal(isValidUUID("not-a-valid-uuid"), false);
});

test("returns false for an empty string", () => {
  assert.equal(isValidUUID(""), false);
});