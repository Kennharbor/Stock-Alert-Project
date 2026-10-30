# StockAlert API

StockAlert API is a REST API designed for small retail shop owners to manage inventory, organize products into categories, record stock movements, and identify products that are running low.

The project is being developed as a three-week, part-time learning project using JavaScript, Express, PostgreSQL, and Drizzle ORM. Each authenticated user has an isolated inventory, and stock changes are recorded through dedicated stock-movement operations.

## Project Status

**Current phase: Week 2 completed; Week 3 testing, documentation, security review, and deployment work remains.**

### Completed Features

* Node.js and Express server using JavaScript ES modules.
* PostgreSQL database connection and Drizzle ORM schema and migrations.
* Database tables for users, categories, products, and stock movements.
* Server and database health-check endpoints.
* User registration and login.
* Password hashing using bcrypt.
* JWT-based bearer-token authentication for protected routes.
* Per-user authorization and resource ownership checks.
* Category CRUD operations, including duplicate-name validation.
* Product CRUD operations with request validation.
* Per-user SKU uniqueness enforced by a database constraint.
* Category ownership checks when creating or updating products.
* Product filtering by category.
* Stock-in and stock-out operations.
* Stock movement history for individual products.
* Transactional stock updates and movement-record creation.
* Prevention of stock-out operations that would result in negative stock.
* UUID validation for product, category, and stock-movement endpoints.
* Request validation using Zod, including rejection of unexpected fields.
* Manual API testing of successful requests, invalid input, authentication failures, duplicate records, missing resources, ownership restrictions, and stock-movement edge cases.
* API design documentation, an OpenAPI document, an ERD, and example HTTP requests.
* Automated tests using Node.js's built-in test runner, covering authentication, authorization, CRUD operations, validation, stock movements, and user data isolation.

### Remaining Work

* Complete final security checks, deployment, and project presentation.
* Final security and production configuration checks.
* Deploy the API and verify the deployed endpoints.
* Prepare the final project presentation.
* Finalize the project documentation and presentation.

## Technology Stack

| Area               | Technology                                          |
| ------------------ | --------------------------------------------------- |
| Runtime            | Node.js                                             |
| Language           | JavaScript with ES modules                          |
| HTTP framework     | Express                                             |
| Database           | PostgreSQL                                          |
| Database access    | Drizzle ORM                                         |
| Migrations         | Drizzle Kit                                         |
| PostgreSQL driver  | `pg`                                                |
| Configuration      | dotenv                                              |
| Request validation | Zod                                                 |
| Password hashing   | bcrypt                                              |
| Authentication     | JSON Web Tokens (JWT)                               |
| API documentation  | OpenAPI                                             |
| Development tools  | VS Code, Git, GitHub, PostgreSQL tools, and Postman |

## Main Entities

* **User:** Stores account information and authentication details.
* **Category:** Groups products belonging to a user.
* **Product:** Represents an inventory item with a name, SKU, quantity, minimum stock level, price, and optional category.
* **StockMovement:** Records stock entering or leaving a product's inventory, including movement type, quantity, optional note, and timestamp.

### Data Relationships

* A user can own multiple categories.
* A user can own multiple products.
* A user can have multiple stock-movement records.
* A category can contain multiple products.
* A product can have multiple stock-movement records.
* Deleting a category preserves its products and removes their category association.
* Deleting a product also deletes its associated stock-movement records.

See [`docs/erd.dbml`](docs/erd.dbml) for the database relationship diagram.

## Requirements

Install Node.js and PostgreSQL before running the project locally.

The development database is named `stockalert_db`. Make sure you use this project's database rather than the separate database used by another project.

## Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/Kennharbor/Stock-Alert-Project.git
cd Stock-Alert-Project
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file:

PowerShell:

```powershell
Copy-Item .env.example .env
```

Update `.env` with your local PostgreSQL connection details and a strong, unique JWT secret.

The project requires a `DATABASE_URL` connection string and a `JWT_SECRET`. The token lifetime can be configured with `JWT_EXPIRES_IN`; the application defaults to `1h` when that variable is not set.

Keep `.env` private and never commit it to Git.

### 4. Create the database

Create a PostgreSQL database named `stockalert_db`, or use another database dedicated to this project and update `DATABASE_URL` accordingly.

### 5. Apply database migrations

```bash
npx drizzle-kit migrate
```

### 6. Start the development server

```bash
npm run dev
```

To start the server without watch mode:

```bash
npm start
```

The application uses port `3000` by default, unless configured otherwise.

### 7. Check server and database health

Server health:

```http
GET http://localhost:3000/api/v1/health
```

Database health:

```http
GET http://localhost:3000/api/v1/health/db
```

A successful response confirms that the server is running or that the database health check has completed successfully.

## Authentication

Register a user through:

```http
POST /api/v1/auth/register
Content-Type: application/json
```

Example request:

```json
{
  "email": "owner@example.com",
  "password": "your-development-password"
}
```

Log in through:

```http
POST /api/v1/auth/login
Content-Type: application/json
```

A successful login returns a JWT bearer token.

Include that token when calling protected endpoints:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

Registration and login are public endpoints. Product, category, and stock-movement operations require authentication.

The API hashes passwords using bcrypt and verifies JWTs on protected routes. Resource queries are scoped to the authenticated user to prevent users from accessing another user's inventory.

## API Overview

All endpoints use the `/api/v1` prefix.

| Method | Endpoint                                      | Purpose                                      | Authentication |
| ------ | --------------------------------------------- | -------------------------------------------- | -------------- |
| GET    | `/api/v1/health`                              | Check server health                          | No             |
| GET    | `/api/v1/health/db`                           | Check database connectivity                  | No             |
| POST   | `/api/v1/auth/register`                       | Register a user                              | No             |
| POST   | `/api/v1/auth/login`                          | Log in and obtain a JWT                      | No             |
| POST   | `/api/v1/categories`                          | Create a category                            | Yes            |
| GET    | `/api/v1/categories`                          | List categories                              | Yes            |
| GET    | `/api/v1/categories/:id`                      | Retrieve a category                          | Yes            |
| PATCH  | `/api/v1/categories/:id`                      | Update a category                            | Yes            |
| DELETE | `/api/v1/categories/:id`                      | Delete a category                            | Yes            |
| POST   | `/api/v1/products`                            | Create a product                             | Yes            |
| GET    | `/api/v1/products`                            | List products; optionally filter by category | Yes            |
| GET    | `/api/v1/products/:id`                        | Retrieve a product                           | Yes            |
| PATCH  | `/api/v1/products/:id`                        | Update product details                       | Yes            |
| DELETE | `/api/v1/products/:id`                        | Delete a product                             | Yes            |
| POST   | `/api/v1/products/:productId/stock-movements` | Record stock entering or leaving inventory   | Yes            |
| GET    | `/api/v1/products/:productId/stock-movements` | Retrieve stock movement history              | Yes            |

For complete request and response details, see [`docs/api-spec.md`](docs/api-spec.md) and [`docs/openapi.yaml`](docs/openapi.yaml).

## Validation and Error Handling

Zod validates incoming request bodies before they reach the relevant controller.

The API validates resource UUIDs and checks resource ownership. Invalid input is rejected before the corresponding database operation proceeds.

Examples of tested validation and error scenarios include:

* Invalid request bodies return `400 Bad Request`.
* Malformed resource UUIDs return `400 Bad Request`.
* Requests without a valid bearer token return `401 Unauthorized` on protected routes.
* Attempts to access resources belonging to another user return `404 Not Found`.
* Duplicate category names or product SKUs within the same user's inventory are rejected.
* Stock movement quantities must be positive whole numbers.
* Invalid movement types and unexpected request properties are rejected.
* Stock-out requests that exceed available inventory return `409 Conflict`.
* Requests for valid but nonexistent resources return `404 Not Found`.

The API also relies on PostgreSQL constraints to protect important data-integrity rules.

## Automated Testing

The project uses Node.js's built-in test runner.

Run the complete test suite with:

```bash
npm test
```
## Key Design Decisions

1. **PostgreSQL:** The inventory domain has clear relationships and benefits from foreign keys, unique constraints, and transactions.
2. **Drizzle ORM:** Provides JavaScript-friendly schema definitions and migrations while keeping SQL concepts visible.
3. **UUID primary keys:** Provide stable identifiers for users and inventory resources.
4. **Per-user SKU uniqueness:** The composite unique constraint on `(user_id, sku)` allows different users to use the same SKU while preventing duplicates within an individual user's inventory.
5. **Stock changes through movements:** Stock-in and stock-out operations update product quantity and create the corresponding movement record within one database transaction. Ordinary product updates cannot directly change quantity.
6. **Server-side ownership checks:** Protected database operations use the authenticated user ID rather than trusting a user ID supplied by the client.
7. **Category ownership:** A product can only be associated with a category owned by the authenticated user.
8. **Validation at multiple levels:** Zod validates incoming requests, while database constraints protect critical integrity rules.
9. **Computed stock status:** The intended status rules are:

   * `OUT_OF_STOCK` when quantity is zero.
   * `LOW_STOCK` when quantity is above zero and less than or equal to the minimum stock level.
   * `IN_STOCK` when quantity exceeds the minimum stock level.

   These rules describe the intended stock-status behavior; confirm whether a computed status response has been implemented before treating it as a completed API feature.

## Testing

The current implementation has been manually tested using an HTTP client.

Testing has covered authentication, protected routes, product and category CRUD, resource ownership, UUID validation, request-body validation, stock movements, stock history, and important error responses.

Automated test coverage, a repeatable test procedure, and final deployment verification remain part of the Week 3 work.

## Project Documentation

* [`docs/api-spec.md`](docs/api-spec.md) — API design and endpoint contracts.
* [`docs/openapi.yaml`](docs/openapi.yaml) — OpenAPI specification.
* [`docs/erd.dbml`](docs/erd.dbml) — Entity relationship diagram.
* [`requests/products.http`](requests/products.http) — Example product HTTP requests.

## Security Notes

* Never commit `.env`, passwords, database credentials, or JWT secrets.
* Never store plaintext passwords.
* Use a strong, unique JWT secret.
* Keep protected routes behind JWT authentication.
* Scope database operations to the authenticated user.
* Use HTTPS in production.
* Review error handling, configuration, dependency advisories, and deployment settings before production use.
