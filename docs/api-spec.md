# StockAlert API — REST API Specification

**Base path:** `/api/v1`  
**Format:** JSON  
**Authentication:** `Authorization: Bearer <JWT>` on protected endpoints.  
**Status:** Core authentication, category, product, and stock-movement
endpoints are implemented and manually tested. Final documentation
alignment, automated testing, security review, and deployment remain.

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

Registration and login are public endpoints. All category, product, and stock-movement endpoints require a valid JWT bearer token.

### `POST /auth/register`

Creates a user account and stores a bcrypt password hash. The response includes the user's public account fields only; the password and password hash are never returned.

**Request:**

```json
{
  "email": "owner@example.com",
  "password": "StrongPass123!"
}
```

**Response `201`:**

```json
{
  "success": true,
  "message": "Account created successfully.",
  "data": {
    "id": "user-uuid",
    "email": "owner@example.com",
    "createdAt": "2026-10-23T10:00:00.000Z"
  }
}
```

**Status codes:** `201` account created, `400` invalid input, `409` email already registered.

Passwords must satisfy the registration validation rules. Passwords exceeding bcrypt's 72-byte UTF-8 input limit are rejected.

### `POST /auth/login`

Verifies the user's credentials and returns a JWT bearer token.

**Request:**

```json
{
  "email": "owner@example.com",
  "password": "StrongPass123!"
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "owner@example.com"
    },
    "token": "<jwt>",
    "tokenType": "Bearer",
    "expiresIn": "1h"
  }
}
```

The token expiration is controlled by `JWT_EXPIRES_IN` and defaults to `1h` if the environment variable is not configured.

**Status codes:** `200` login successful, `400` invalid input, `401` invalid email or password.

Unknown email addresses and incorrect passwords produce the same authentication error response.

## Categories

All category endpoints require authentication. Each category belongs to the authenticated user. Users can only retrieve, update, or delete their own categories.

### `POST /categories`

Creates a category for the authenticated user.

**Request:**

```json
{
  "name": "Groceries",
  "description": "Food and household essentials"
}
```

The `name` field is required. The `description` field is optional.

**Response `201`:**

```json
{
  "success": true,
  "message": "Category created successfully.",
  "data": {
    "id": "category-uuid",
    "userId": "authenticated-user-uuid",
    "name": "Groceries",
    "description": "Food and household essentials",
    "createdAt": "2026-10-23T12:00:00.000Z"
  }
}
```

**Status codes:** `201` category created, `400` invalid request, `401` unauthorized, `409` duplicate category name, `500` unexpected server error.

### `GET /categories`

Lists all categories owned by the authenticated user.

**Response `200`:**

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "category-uuid",
      "userId": "authenticated-user-uuid",
      "name": "Groceries",
      "description": "Food and household essentials",
      "createdAt": "2026-10-23T12:00:00.000Z"
    }
  ]
}
```

The `count` field represents the number of categories returned.

**Status codes:** `200`, `401`, `500`.

### `GET /categories/:categoryId`

Retrieves a category owned by the authenticated user.

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": "category-uuid",
    "userId": "authenticated-user-uuid",
    "name": "Groceries",
    "description": "Food and household essentials",
    "createdAt": "2026-10-23T12:00:00.000Z"
  }
}
```

**Status codes:** `200`, `400` invalid UUID, `401`, `404` category not found or not owned by the user, `500`.

### `PATCH /categories/:categoryId`

Updates a category's `name`, `description`, or both. Only the supplied fields are updated.

**Request:**

```json
{
  "name": "Dry Goods"
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Category updated successfully.",
  "data": {
    "id": "category-uuid",
    "userId": "authenticated-user-uuid",
    "name": "Dry Goods",
    "description": "Food and household essentials",
    "createdAt": "2026-10-23T12:00:00.000Z"
  }
}
```

A category name that duplicates another category belonging to the same user is rejected.

**Status codes:** `200`, `400` invalid request or UUID, `401`, `404` category not found or not owned by the user, `409` duplicate category name, `500`.

### `DELETE /categories/:categoryId`

Deletes a category owned by the authenticated user.

Products previously associated with the category are preserved, and their `categoryId` values become `null` through the database's foreign-key relationship.

**Response `200`:**

```json
{
  "success": true,
  "message": "Category deleted successfully.",
  "data": {
    "id": "category-uuid",
    "name": "Groceries"
  }
}
```

**Status codes:** `200`, `400` invalid UUID, `401`, `404` category not found or not owned by the user, `500`.

## Products

All product endpoints require authentication. Product queries and mutations are scoped to the authenticated user's ID. The API does not accept `userId` from the request body as an ownership field.

SKU is unique within each user's inventory, not globally.

### `POST /products`

Creates a product.

The `name` and `sku` fields are required. `quantity` is initialized to `0` by the server and cannot be supplied in the create request. `minimumStockLevel` defaults to `5`. `unitPrice` and `categoryId` are optional.

If `categoryId` is provided, the category must belong to the authenticated user. New products should receive initial stock through a stock-in movement so that the movement history remains auditable.

**Request:**

```json id="4j2w5d"
{
  "name": "Golden Penny Rice 5kg",
  "sku": "RICE-005",
  "minimumStockLevel": 10,
  "unitPrice": 4500.00,
  "categoryId": "category-uuid"
}
```

**Response `201`:**

```json id="1x8g3j"
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
    "createdAt": "2026-10-23T12:00:00.000Z",
    "updatedAt": "2026-10-23T12:00:00.000Z"
  }
}
```

The example assumes the category exists and belongs to the authenticated user. Database-generated IDs and timestamps will vary.

**Status codes:** `201` product created, `400` invalid request, `401` unauthorized, `404` category not found or not owned by the user, `409` duplicate SKU, `500` unexpected server error.

### `GET /products`

Lists products belonging to the authenticated user.

The optional `categoryId` query parameter filters the results to products associated with that category UUID.

**Example request:**

```http
GET /api/v1/products?categoryId=category-uuid
```

**Response `200`:**

```json id="62g8dy"
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "product-uuid",
      "userId": "authenticated-user-uuid",
      "categoryId": "category-uuid",
      "name": "Golden Penny Rice 5kg",
      "sku": "RICE-005",
      "quantity": 0,
      "minimumStockLevel": 10,
      "unitPrice": "4500.00",
      "createdAt": "2026-10-23T12:00:00.000Z",
      "updatedAt": "2026-10-23T12:00:00.000Z"
    }
  ]
}
```

The `count` field indicates the number of products returned.

**Status codes:** `200`, `400` invalid category UUID, `401`, `500`.

### `GET /products/:productId`

Retrieves a product owned by the authenticated user.

**Response `200`:**

```json id="5vrm8f"
{
  "success": true,
  "data": {
    "id": "product-uuid",
    "userId": "authenticated-user-uuid",
    "categoryId": "category-uuid",
    "name": "Golden Penny Rice 5kg",
    "sku": "RICE-005",
    "quantity": 0,
    "minimumStockLevel": 10,
    "unitPrice": "4500.00",
    "createdAt": "2026-10-23T12:00:00.000Z",
    "updatedAt": "2026-10-23T12:00:00.000Z"
  }
}
```

**Status codes:** `200`, `400` invalid product UUID, `401`, `404` product not found or not owned by the user, `500`.

### `PATCH /products/:productId`

Updates product details. Supported fields are `name`, `sku`, `minimumStockLevel`, `unitPrice`, and `categoryId`.

Only supplied fields are updated. The `quantity` field cannot be changed through this endpoint; stock changes must use the stock-movement endpoints.

Set `categoryId` to `null` to remove the product's category association. If a non-null category ID is supplied, the category must belong to the authenticated user.

**Request:**

```json id="1t5vhr"
{
  "minimumStockLevel": 12,
  "unitPrice": 4600.00
}
```

**Response `200`:**

```json id="a2b4dc"
{
  "success": true,
  "message": "Product updated successfully.",
  "data": {
    "id": "product-uuid",
    "userId": "authenticated-user-uuid",
    "categoryId": "category-uuid",
    "name": "Golden Penny Rice 5kg",
    "sku": "RICE-005",
    "quantity": 0,
    "minimumStockLevel": 12,
    "unitPrice": "4600.00",
    "createdAt": "2026-10-23T12:00:00.000Z",
    "updatedAt": "2026-10-23T12:05:00.000Z"
  }
}
```

**Status codes:** `200`, `400` invalid request or product UUID, `401`, `404` product or category not found or not owned by the user, `409` duplicate SKU, `500`.

### `DELETE /products/:productId`

Deletes a product owned by the authenticated user.

Deleting a product also deletes its associated stock-movement history through the database's cascading relationship.

**Response `200`:**

```json id="w7ns4k"
{
  "success": true,
  "message": "Product deleted successfully.",
  "data": {
    "id": "product-uuid",
    "name": "Golden Penny Rice 5kg",
    "sku": "RICE-005"
  }
}
```

**Status codes:** `200`, `400` invalid product UUID, `401`, `404` product not found or not owned by the user, `500`.

## Stock movements

Stock movements record changes to a product's stock quantity. Only authenticated users can record or view movements for products they own.

### Record a stock movement

**Endpoint:** `POST /products/:productId/stock-movements`

**Authentication:** Required

**Description:** Records stock entering or leaving a product's inventory. The product quantity update and movement record are saved within a single database transaction.

**Request body — stock received:**

```json
{
  "type": "STOCK_IN",
  "quantity": 20,
  "note": "Restock delivery"
}
```

**Request body — stock removed:**

```json
{
  "type": "STOCK_OUT",
  "quantity": 3,
  "note": "Items sold"
}
```

The `note` field is optional, may be `null`, and must not exceed 500 characters.

**Validation rules:**

* `type` must be `STOCK_IN` or `STOCK_OUT`.
* `quantity` must be a positive integer.
* Additional request properties are rejected.
* `productId` must be a valid UUID.
* The product must belong to the authenticated user.
* A stock-out operation cannot remove more units than are currently available.

**Success response — `201 Created`:**

```json
{
  "success": true,
  "message": "Stock movement recorded successfully.",
  "data": {
    "id": "movement-uuid",
    "userId": "user-uuid",
    "productId": "product-uuid",
    "type": "STOCK_IN",
    "quantity": 20,
    "note": "Restock delivery",
    "createdAt": "2026-10-23T10:00:00.000Z",
    "resultingStock": 20
  }
}
```

The UUIDs and timestamp above are illustrative. The actual response includes the database-generated movement fields and the product's resulting stock quantity.

**Error responses:**

| Status                      | Condition                                                           | Message                                                             |
| --------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `400 Bad Request`           | Invalid product UUID or invalid request body                        | Validation error or `Invalid product ID. A valid UUID is required.` |
| `401 Unauthorized`          | Missing, invalid, or expired authentication token                   | Authentication error                                                |
| `404 Not Found`             | Product does not exist or does not belong to the authenticated user | `Product not found.`                                                |
| `409 Conflict`              | Stock-out quantity exceeds available stock                          | `Insufficient stock for this operation.`                            |
| `500 Internal Server Error` | Unexpected server or database error                                 | `An error occurred while recording the stock movement.`             |

For an insufficient-stock response, the API also returns `availableStock`, indicating the product's current quantity.

**Insufficient-stock example — `409 Conflict`:**

```json
{
  "success": false,
  "message": "Insufficient stock for this operation.",
  "availableStock": 2
}
```

### Retrieve stock movement history

**Endpoint:** `GET /products/:productId/stock-movements`

**Authentication:** Required

**Description:** Retrieves the movement history for a product owned by the authenticated user, ordered from newest to oldest.

**Success response — `200 OK`:**

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "movement-uuid-2",
      "userId": "user-uuid",
      "productId": "product-uuid",
      "type": "STOCK_OUT",
      "quantity": 3,
      "note": "Items sold",
      "createdAt": "2026-10-23T11:00:00.000Z"
    },
    {
      "id": "movement-uuid-1",
      "userId": "user-uuid",
      "productId": "product-uuid",
      "type": "STOCK_IN",
      "quantity": 20,
      "note": "Restock delivery",
      "createdAt": "2026-10-23T10:00:00.000Z"
    }
  ]
}
```

**Error responses:**

| Status                      | Condition                                                           | Message                                               |
| --------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| `400 Bad Request`           | Invalid product UUID                                                | `Invalid product ID. A valid UUID is required.`       |
| `401 Unauthorized`          | Missing, invalid, or expired authentication token                   | Authentication error                                  |
| `404 Not Found`             | Product does not exist or does not belong to the authenticated user | `Product not found.`                                  |
| `500 Internal Server Error` | Unexpected server or database error                                 | `An error occurred while retrieving stock movements.` |

### Stock movement rules

* Stock changes are recorded through stock movements rather than direct product quantity edits.
* Each movement and its corresponding product quantity update occur within one database transaction.
* The product row is locked during a stock update to help prevent concurrent stock changes from overwriting one another.
* Stock-out operations cannot reduce the quantity below zero.
* Users can record or view movements only for products they own.
* Movement history is returned in descending creation-time order.

## Design decisions

- PostgreSQL was chosen because the entities have relational ownership and foreign-key relationships, and stock changes require transactions.
- UUIDs are primary keys; they are stable internal identifiers and are not meant to be human-readable inventory codes.
- SKU is a business-facing stock keeping code and is unique per user via the composite constraint `(user_id, sku)`.
- `unit_price` uses `DECIMAL(12,2)` to avoid binary floating-point storage for currency; API input should be non-negative and limited to two decimal places.
- `quantity` and `minimum_stock_level` are integers. Stock movements record positive quantities with a separate `type`.
- Product quantity is updated only through stock movements so the movement history remains meaningful.
- Every protected database operation must filter by the authenticated user. Category ownership is checked before associating a category with a product.
- Zod validates incoming data; database constraints remain the final guard for uniqueness and referential integrity.
