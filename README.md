# StockAlert API

StockAlert API is a REST API for small retail shop owners to manage inventory, track stock movements, and identify products that are running low.

The project is being built as a three-week, part-time learning project. It uses dummy/development data during development and is designed so each authenticated user's inventory is isolated from other users.

## Project status

## Project status

**Completed**

* Node.js and Express server setup using JavaScript ES modules.
* PostgreSQL database connection using `pg`.
* Drizzle ORM schema and migrations for `users`, `categories`, `products`, and `stock_movements`.
* Server and database health-check endpoints.
* Product CRUD endpoints: create, list, retrieve by ID, update, and delete.
* Request-body validation using Zod.
* Per-user SKU uniqueness enforced at the database level.
* Product ownership filtering through temporary development-user middleware.
* Sample categories and products inserted for development.
* Manual API testing using HTTP requests, including successful requests, validation errors, duplicate SKU conflicts, and missing-product responses.
* API design documentation and sample HTTP requests.

**Still to implement**

* User registration and login.
* Password hashing and JWT-based authentication.
* Replacement of temporary development-user middleware with verified authentication.
* Category CRUD endpoints.
* Stock-in and stock-out operations, including stock movement records and transactional quantity updates.
* Computed stock-status responses.
* Automated tests, final documentation review, security checks, and deployment.


## Technology stack

- **Runtime:** Node.js (JavaScript, ES modules)
- **HTTP framework:** Express
- **Database:** PostgreSQL
- **Database access and migrations:** Drizzle ORM, Drizzle Kit, `pg`
- **Configuration:** dotenv
- **Request validation:** Zod
- **Authentication:** bcrypt for password hashing and JWT for bearer tokens
- **Testing:** Node.js test runner or another lightweight test framework (to be confirmed during Week 3)
- **API documentation:** OpenAPI
- **Tools:** Git/GitHub, VS Code, PostgreSQL SQL Shell/pgAdmin, Postman or an equivalent HTTP client

## Main entities

- **User:** account and authentication details
- **Category:** a user's product categories
- **Product:** an inventory item with SKU, quantity, minimum stock level, and optional price/category
- **StockMovement:** an auditable record of stock entering or leaving a product's inventory

See [`docs/erd.dbml`](docs/erd.dbml), [`docs/api-spec.md`](docs/api-spec.md), and [`docs/work-plan.md`](docs/work-plan.md).

## Requirements

Install a supported Node.js LTS version and PostgreSQL. Create a PostgreSQL database for this project (currently named `stockalert_db`). Do not use the separate database belonging to another project.

## Run locally

1. Clone the repository and enter the project directory.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and replace the placeholder database credentials with your local PostgreSQL settings. Never commit `.env`.

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Ensure the database named in `DATABASE_URL` exists.
5. Apply migrations:

   ```bash
   npx drizzle-kit migrate
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

   Or start it normally:

   ```bash
   npm start
   ```

7. Check the server:

   - `GET http://localhost:3000/api/v1/health`
   - `GET http://localhost:3000/api/v1/health/db`

The current package scripts are expected to be `dev: node --watch src/server.js` and `start: node src/server.js`.

## Environment variables

See [`.env.example`](.env.example). Keep secrets and local credentials in `.env`, which must remain untracked by Git.

## Key design decisions

1. **PostgreSQL instead of a NoSQL database:** the data has clear relationships and needs foreign keys, uniqueness constraints, transactions, and reliable stock updates.
2. **Drizzle ORM:** provides JavaScript-friendly schema definitions and SQL migrations while keeping the underlying SQL concepts visible.
3. **UUID primary keys:** records can use stable identifiers without exposing sequential database IDs.
4. **SKU unique per user:** a composite unique constraint on `(user_id, sku)` allows different shops to use the same SKU while preventing duplicates within one shop's inventory.
5. **Quantity changes through stock movements:** stock-in and stock-out operations will update product quantity and create a movement record in the same database transaction. Ordinary product updates must not directly change quantity.
6. **Ownership enforced on the server:** the authenticated user ID comes from verified authentication middleware, never from a client-supplied `userId`. All category, product, and movement operations must be scoped to that user.
7. **Computed stock status:** `OUT_OF_STOCK` when quantity is zero; `LOW_STOCK` when quantity is above zero and less than or equal to the minimum stock level; otherwise `IN_STOCK`.
8. **Validation at two levels:** Zod validates incoming requests; database constraints protect critical integrity rules.

## API overview

All application endpoints use the `/api/v1` prefix. Authentication uses a bearer JWT after login. The current API contract is documented in [`docs/api-spec.md`](docs/api-spec.md) and [`docs/openapi.yaml`](docs/openapi.yaml).

## Security notes

- Never commit `.env`, passwords, JWT secrets, or real customer data.
- Passwords will be hashed with bcrypt; plaintext passwords must never be stored.
- Protected routes must verify JWTs and enforce per-user ownership.
- Production deployment must use HTTPS and a strong, unique `JWT_SECRET`.
