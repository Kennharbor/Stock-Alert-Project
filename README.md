# StockAlert API

StockAlert API is a REST API designed for small retail shop owners to manage inventory, organize products into categories, record stock movements, and identify products that are running low.

Built with JavaScript, Express, PostgreSQL, and Drizzle ORM, the API provides authenticated inventory management with per-user data isolation. Stock changes are recorded through dedicated stock-movement operations, with transactional updates to maintain data integrity.

**Live API:** https://stock-alert-api-sf8t.onrender.com

## Project Status

**Status: Implemented, tested, and deployed.**

The API is deployed on Render and uses Neon PostgreSQL for its hosted database. The production health endpoints and application functionality have been tested successfully.

### Features

* User registration and login.
* Password hashing using bcrypt.
* JWT bearer-token authentication.
* Authorization and per-user resource ownership checks.
* Category creation, retrieval, updating, and deletion.
* Product creation, retrieval, updating, and deletion.
* Product filtering by category.
* Per-user SKU uniqueness enforced by a database constraint.
* Category ownership validation when assigning categories to products.
* Stock-in and stock-out operations.
* Stock movement history for individual products.
* Transactional stock updates and movement-record creation.
* Prevention of stock-out operations that exceed available inventory.
* UUID validation and request validation using Zod.
* Rejection of unexpected request properties where strict validation is configured.
* Consistent handling of authentication, validation, duplicate-record, and missing-resource errors.
* Automated tests using Node.js's built-in test runner.
* API specification, OpenAPI documentation, ERD, and example HTTP requests.
* Hosted PostgreSQL database using Neon.
* Public API deployment using Render.

## Live Deployment

**Base URL**

```text
https://stock-alert-api-sf8t.onrender.com
```

### Health Endpoints

| Method | Endpoint            | Purpose                     |
| ------ | ------------------- | --------------------------- |
| GET    | `/api/v1/health`    | Check server health         |
| GET    | `/api/v1/health/db` | Check database connectivity |

Both endpoints have been tested successfully against the deployed service.

> Note: The API is hosted on Render. Depending on the hosting plan, the service may take time to respond after an idle period.

## Technology Stack

| Area               | Technology                   |
| ------------------ | ---------------------------- |
| Runtime            | Node.js                      |
| Language           | JavaScript with ES modules   |
| HTTP framework     | Express                      |
| Database           | PostgreSQL                   |
| Hosted database    | Neon                         |
| Database access    | Drizzle ORM                  |
| Migrations         | Drizzle Kit                  |
| PostgreSQL driver  | `pg`                         |
| Configuration      | dotenv                       |
| Request validation | Zod                          |
| Password hashing   | bcrypt                       |
| Authentication     | JSON Web Tokens (JWT)        |
| Testing            | Node.js built-in test runner |
| Hosting            | Render                       |
| Version control    | Git and GitHub               |

## Main Entities

* **User:** Stores account and authentication information.
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

See [`docs/erd.dbml`](docs/erd.dbml) for the entity relationship diagram.

## Requirements

For local development, install Node.js and PostgreSQL.

The development database is named `stockalert_db`. Use a database dedicated to this project rather than the separate database used by another project.

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

Copy the example environment file.

PowerShell:

```powershell
Copy-Item .env.example .env
```

Configure the following variables in `.env`:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_strong_random_secret
JWT_EXPIRES_IN=1h
```

Replace the example values with the appropriate local development settings.

* `PORT` specifies the server port.
* `NODE_ENV` specifies the application environment.
* `DATABASE_URL` contains the PostgreSQL connection string.
* `JWT_SECRET` is used to sign and verify authentication tokens.
* `JWT_EXPIRES_IN` controls the token lifetime.

Keep `.env` private. Never commit database credentials or JWT secrets to GitHub.

### 4. Create the database

Create a PostgreSQL database named `stockalert_db`, or use another database dedicated to this project and update `DATABASE_URL` accordingly.

### 5. Apply database migrations

```bash
npx drizzle-kit migrate
```

This applies the project's existing Drizzle migrations to the database specified by `DATABASE_URL`.

### 6. Start the server

Development mode:

```bash
npm run dev
```

Standard mode:

```bash
npm start
```

The application uses port `3000` by default unless another port is configured.

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

### Register a User

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

### Log In

```http
POST /api/v1/auth/login
Content-Type: application/json
```

Use the registered email and password. A successful login returns a JWT bearer token.

### Access Protected Endpoints

Include the token in the request header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

Registration and login are public endpoints. Product, category, and stock-movement operations require authentication.

Passwords are hashed using bcrypt, and JWTs are verified on protected routes. Resource queries are scoped to the authenticated user to prevent access to another user's inventory.

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

For complete request and response details, see:

* [`docs/api-spec.md`](docs/api-spec.md)
* [`docs/openapi.yaml`](docs/openapi.yaml)

## Validation and Error Handling

Zod validates incoming request bodies before they reach the relevant controller.

The API validates resource UUIDs and checks resource ownership. Invalid input is rejected before the corresponding database operation proceeds.

Tested validation and error scenarios include:

* Invalid request bodies return `400 Bad Request`.
* Malformed resource UUIDs return `400 Bad Request`.
* Requests without a valid bearer token return `401 Unauthorized` on protected routes.
* Attempts to access resources belonging to another user return `404 Not Found`.
* Duplicate category names or product SKUs within the same user's inventory are rejected.
* Stock movement quantities must be positive whole numbers.
* Invalid movement types and unexpected request properties are rejected.
* Stock-out requests that exceed available inventory return `409 Conflict`.
* Requests for valid but nonexistent resources return `404 Not Found`.

PostgreSQL constraints provide additional protection for important data-integrity rules.

## Automated Testing

The project uses Node.js's built-in test runner.

Run the complete test suite:

```bash
npm test
```

The test suite has **79 passing tests and zero failures** in the local development environment.

Tests cover authentication, authorization, health endpoints, CRUD operations, validation, stock movements, and user data isolation.

The deployed API's health endpoints and core application functionality have also been tested successfully.

## Key Design Decisions

1. **PostgreSQL:** Provides relational integrity through foreign keys, unique constraints, and transactions.
2. **Drizzle ORM:** Provides JavaScript-friendly schema definitions and migrations while keeping SQL concepts visible.
3. **UUID primary keys:** Provide stable identifiers for users and inventory resources.
4. **Per-user SKU uniqueness:** The composite unique constraint on `(user_id, sku)` allows different users to use the same SKU while preventing duplicates within an individual user's inventory.
5. **Stock changes through movements:** Stock-in and stock-out operations update product quantity and create the corresponding movement record within one database transaction.
6. **Server-side ownership checks:** Protected database operations use the authenticated user ID rather than trusting a user ID supplied by the client.
7. **Category ownership:** A product can only be associated with a category owned by the authenticated user.
8. **Validation at multiple levels:** Zod validates incoming requests, while database constraints protect critical integrity rules.

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
* Review dependency advisories and production configuration periodically.
