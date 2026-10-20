import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

const SALT_ROUNDS = 12;

export async function register(req, res, next) {
try {
const { email, password } = req.body;

// Check whether the email is already registered.
const [existingUser] = await db
  .select({ id: users.id })
  .from(users)
  .where(eq(users.email, email))
  .limit(1);

if (existingUser) {
  return res.status(409).json({
    success: false,
    message: "An account with this email already exists.",
  });
}

// bcrypt has a 72-byte password input limit.
if (Buffer.byteLength(password, "utf8") > 72) {
  return res.status(400).json({
    success: false,
    message: "Password must not exceed 72 bytes when encoded as UTF-8.",
  });
}

// Hash the password before storing it.
const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

// Create the user and return only public account fields.
const [newUser] = await db
  .insert(users)
  .values({
    email,
    passwordHash,
  })
  .returning({
    id: users.id,
    email: users.email,
    createdAt: users.createdAt,
  });

return res.status(201).json({
  success: true,
  message: "Account created successfully.",
  data: newUser,
});


} catch (error) {
// PostgreSQL unique-constraint violation.
// This also protects against two simultaneous registrations.
if (error.code === "23505") {
return res.status(409).json({
success: false,
message: "An account with this email already exists.",
});
}


next(error);


}
}

export async function login(req, res, next) {
try {
const { email, password } = req.body;


// Find the account associated with this email.
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.email, email))
  .limit(1);

// Use the same response for an unknown email or incorrect password.
if (!user) {
  return res.status(401).json({
    success: false,
    message: "Invalid email or password.",
  });
}

// Compare the submitted password with the stored bcrypt hash.
const passwordMatches = await bcrypt.compare(
  password,
  user.passwordHash,
);

if (!passwordMatches) {
  return res.status(401).json({
    success: false,
    message: "Invalid email or password.",
  });
}

// JWT generation will be added after the login credentials are verified.
const token = jwt.sign(
  { email: user.email },
  process.env.JWT_SECRET,
  {
    subject: user.id,
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  },
);

return res.status(200).json({
  success: true,
  message: "Login successful.",
  data: {
    user: {
      id: user.id,
      email: user.email,
    },
    token,
    tokenType: "Bearer",
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  },
});


} catch (error) {
next(error);
}
}

