import jwt from "jsonwebtoken";

export function authenticateToken(req, res, next) {
const authorization = req.headers.authorization;

// Require the standard Bearer token format.
if (!authorization || !authorization.startsWith("Bearer ")) {
return res.status(401).json({
success: false,
message: "Authentication token is required.",
});
}

const token = authorization.slice(7).trim();

if (!token) {
return res.status(401).json({
success: false,
message: "Authentication token is required.",
});
}

try {
const payload = jwt.verify(token, process.env.JWT_SECRET);

// Ensure the token contains the user ID issued during login.
if (
  typeof payload === "string" ||
  typeof payload.sub !== "string"
) {
  return res.status(401).json({
    success: false,
    message: "Invalid authentication token.",
  });
}

// Attach the authenticated identity to the request.
req.user = {
  id: payload.sub,
  email: payload.email,
};

next();


} catch (error) {
if (
error instanceof jwt.TokenExpiredError ||
error instanceof jwt.JsonWebTokenError ||
error instanceof jwt.NotBeforeError
) {
return res.status(401).json({
success: false,
message: "Invalid or expired authentication token.",
});
}


next(error);


}
}
