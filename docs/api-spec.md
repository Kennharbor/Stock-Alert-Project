# StockAlert API — REST API Specification

**Base path:** `/api/v1`  
**Format:** JSON  
**Authentication:** `Authorization: Bearer <JWT>` on protected endpoints.  
**Status:** This is the planned contract. Endpoints marked below are not necessarily implemented yet.

## Common response conventions

Successful responses use `success: true`; errors use `success: false`. Validation errors return a list of field/message pairs. Dates are ISO 8601 strings. Product `unitPrice` is represented as a decimal string in database responses where appropriate.

Example error:

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    { "field": "quantity", "message": "Quantity cannot be negative." }
  ]
}
```

Common status codes:
- `200 OK`: successful read/update or operation
- `201 Created`: resource created
- `204 No Content`: resource deleted successfully
- `400 Bad Request`: invalid input or validation failure
- `401 Unauthorized`: missing or invalid authentication
- `403 Forbidden`: authenticated but not permitted (if the API distinguishes this from not found)
- `404 Not Found`: resource does not exist or is not visible to this user
- `409 Conflict`: duplicate SKU or business-rule conflict
- `500 Internal Server Error`: unexpected server failure
- `503 Service Unavailable`: database health check failure

## Health

### `GET /health`
Public. Confirms that the API process is running.

**Response `200`:**
```json
{
  "success": true,
  "message": "StockAlert API is running.",
  "timestamp": "2026-01-01T12:00:00.000Z"
}
```

### `GET /health/db`
Public. Runs a lightweight database query.

**Response `200`:**
```json
{
  "success": true,
  "message": "Database connection successful."
}
```

**Response `503`:** database is unavailable.

## Authentication

### `POST /auth/register`
Public. Creates an account and stores a bcrypt password hash.

**Request:**
```json
{ "email": "owner@example.com", "password": "StrongPass123!" }
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Account created successfully.",
  "data": { "id": "uuid", "email": "owner@example.com" }
}
```

**Status codes:** `201`, `400` invalid input, `409` email already registered.

### `POST /auth/login`
Public. Verifies credentials and returns a JWT.

**Request:**
```json
{ "email": "owner@example.com", "password": "StrongPass123!" }
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "<jwt>",
    "tokenType": "Bearer",
    "expiresIn": "1d"
  }
}
```

**Status codes:** `200`, `400` invalid input, `401` invalid credentials.

## Categories

All category endpoints require authentication. A category belongs to the authenticated user.

### `POST /categories`
Creates a category.

**Request:**
```json
{ "name": "Groceries", "description": "Food and household essentials" }
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Category created successfully.",
  "data": {
    "id": "uuid",
    "userId": "authenticated-user-uuid",
    "name": "Groceries",
    "description": "Food and household essentials",
    "createdAt": "2026-01-01T12:00:00.000Z"
  }
}
```

**Status codes:** `201`, `400`, `401`.

### `GET /categories`
Lists categories owned by the authenticated user.

**Response `200`:** `{ "success": true, "data": [{ "id": "uuid", "name": "Groceries" }] }`

**Status codes:** `200`, `401`.

### `GET /categories/:categoryId`
Gets one category owned by the authenticated user.

**Response `200`:** `{ "success": true, "data": { "id": "uuid", "name": "Groceries" } }`

**Status codes:** `200`, `401`, `404`.

### `PATCH /categories/:categoryId`
Updates a category's `name` and/or `description`.

**Request:**
```json
{ "name": "Dry Goods" }
```

**Response `200`:** `{ "success": true, "message": "Category updated successfully.", "data": { "id": "uuid", "name": "Dry Goods" } }`

**Status codes:** `200`, `400`, `401`, `404`.

### `DELETE /categories/:categoryId`
Deletes a category owned by the authenticated user. Products in that category keep their records and have `categoryId` set to `null`.

**Response:** `204 No Content`.

**Status codes:** `204`, `401`, `404`.

## Products

All product endpoints require authentication. Product queries and mutations must be scoped to the authenticated user's ID. `userId` is never accepted as an ownership field from the request body. SKU is unique within a user's inventory, not globally.

Product status is computed:
- `OUT_OF_STOCK` if `quantity === 0`
- `LOW_STOCK` if `quantity > 0 && quantity <= minimumStockLevel`
- `IN_STOCK` if `quantity > minimumStockLevel`

### `POST /products`
Creates a product. `name` and `sku` are required. `quantity` is initialized to `0` by the server and is not accepted in the create request; `minimumStockLevel` defaults to `5`, and `unitPrice`/`categoryId` are optional. If `categoryId` is provided, the category must belong to the authenticated user. New products should start with quantity `0`; any initial stock should be recorded through a stock-in movement so the history remains auditable.

**Request:**
```json
{
  "name": "Golden Penny Rice 5kg",
  "sku": "RICE-005",
  "minimumStockLevel": 10,
  "unitPrice": 4500.00,
  "categoryId": "category-uuid"
}
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Product created successfully.",
  "data": {
    "id": "product-uuid",
    "userId": "authenticated-user-uuid",
    "categoryId": "category-uuid",
    "name": "Golden Penny Rice 5kg",
    "sku": "RICE-005",
    "quantity": 0,
    "minimumStockLevel": 10,
    "unitPrice": "4500.00",
    "status": "OUT_OF_STOCK",
    "createdAt": "2026-01-01T12:00:00.000Z",
    "updatedAt": "2026-01-01T12:00:00.000Z"
  }
}
```

**Status codes:** `201`, `400`, `401`, `404` invalid/not-owned category, `409` duplicate SKU.

### `GET /products`
Lists the authenticated user's products. Optional query parameters: `search`, `categoryId`, `status`. Filtering and pagination can be implemented as time permits; at minimum, the endpoint returns only the user's products.

**Response `200`:** `{ "success": true, "data": [{ "id": "product-uuid", "name": "Golden Penny Rice 5kg", "sku": "RICE-005", "quantity": 0, "minimumStockLevel": 10, "status": "OUT_OF_STOCK" }] }`

**Status codes:** `200`, `401`.

### `GET /products/:productId`
Gets one product owned by the authenticated user.

**Response `200`:** `{ "success": true, "data": { "id": "product-uuid", "name": "Golden Penny Rice 5kg", "sku": "RICE-005" } }`

**Status codes:** `200`, `401`, `404`.

### `PATCH /products/:productId`
Updates product metadata. Allowed fields: `name`, `sku`, `minimumStockLevel`, `unitPrice`, and `categoryId`. **Do not update `quantity` here**; stock changes must go through stock-movement endpoints.

**Request:**
```json
{ "minimumStockLevel": 12, "unitPrice": 4600.00 }
```

**Response `200`:** `{ "success": true, "message": "Product updated successfully.", "data": { "id": "product-uuid", "minimumStockLevel": 12, "unitPrice": "4600.00" } }`

**Status codes:** `200`, `400`, `401`, `404`, `409` duplicate SKU.

### `DELETE /products/:productId`
Deletes a product owned by the authenticated user. Deleting a product also deletes its stock movement history under the current schema's cascading relationship; this behavior should be made clear to the client.

**Response:** `204 No Content`.

**Status codes:** `204`, `401`, `404`.

## Stock movements

All stock movement endpoints require authentication and ownership checks.

### `POST /products/:productId/stock-movements`
Records stock entering or leaving a product. Quantity must be a positive integer. The product quantity update and movement insert must happen in one database transaction. `STOCK_OUT` is rejected if it would make stock negative.

**Request (stock-in):**
```json
{ "type": "STOCK_IN", "quantity": 20, "note": "Restock delivery" }
```

**Request (stock-out):**
```json
{ "type": "STOCK_OUT", "quantity": 3, "note": "Items sold" }
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Stock movement recorded successfully.",
  "data": {
    "id": "movement-uuid",
    "productId": "product-uuid",
    "type": "STOCK_IN",
    "quantity": 20,
    "note": "Restock delivery",
    "createdAt": "2026-01-01T12:00:00.000Z",
    "resultingStock": 20
  }
}
```

**Status codes:** `201`, `400`, `401`, `404`, `409` insufficient stock/business-rule conflict.

### `GET /products/:productId/stock-movements`
Lists movement history for a product owned by the authenticated user, newest first.

**Response `200`:** `{ "success": true, "data": [{ "id": "movement-uuid", "type": "STOCK_IN", "quantity": 20, "note": "Restock delivery", "createdAt": "2026-01-01T12:00:00.000Z" }] }`

**Status codes:** `200`, `401`, `404`.

## Design decisions

- PostgreSQL was chosen because the entities have relational ownership and foreign-key relationships, and stock changes require transactions.
- UUIDs are primary keys; they are stable internal identifiers and are not meant to be human-readable inventory codes.
- SKU is a business-facing stock keeping code and is unique per user via the composite constraint `(user_id, sku)`.
- `unit_price` uses `DECIMAL(12,2)` to avoid binary floating-point storage for currency; API input should be non-negative and limited to two decimal places.
- `quantity` and `minimum_stock_level` are integers. Stock movements record positive quantities with a separate `type`.
- Product quantity is updated only through stock movements so the movement history remains meaningful.
- Every protected database operation must filter by the authenticated user. Category ownership is checked before associating a category with a product.
- Zod validates incoming data; database constraints remain the final guard for uniqueness and referential integrity.
