import { z } from "zod";

export const registerSchema = z
.object({
email: z
.string()
.trim()
.email("Please provide a valid email address.")
.max(255, "Email must not exceed 255 characters.")
.transform((email) => email.toLowerCase()),

password: z
  .string()
  .min(8, "Password must contain at least 8 characters.")
  .max(72, "Password must not exceed 72 characters."),

})
.strict();
