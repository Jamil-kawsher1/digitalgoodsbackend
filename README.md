# DigiStore Backend (Express + Sequelize)

This repository is a ready-to-run Express backend using Sequelize ORM. It supports JWT auth, products, orders, digital keys, and admin workflows.

## Setup

1. Copy `.env.example` to `.env` and set your database credentials and JWT secret.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the server:
   ```bash
   npm run dev
   ```
   The app will sync models to the database automatically (using `sequelize.sync({ alter: true })`).

## Environment variables (.env)
```
DB_DIALECT=mysql
DB_HOST=localhost
DB_NAME=digistore
DB_USER=root
DB_PASS=
DB_PORT=3306
JWT_SECRET=change_this_secret
PORT=4000
```

## Default admin
On first run the server seeds a default admin user:
- email: `admin@site.test`
- password: `admin123`

## API Endpoints (summary)
- `POST /auth/register` { email, password } -> { user, token }
- `POST /auth/login` { email, password } -> { user, token }
- `GET /products` -> list products
- `POST /products` (admin) -> create product
- `POST /orders` (authenticated) { productId } -> create order
- `GET /orders` (authenticated) -> list orders (admin: all, user: own)
- `POST /orders/:id/payment` (authenticated) -> submit payment info
- `POST /orders/:id/mark-paid` (admin) -> mark paid and assign keys
- `GET /users/me` (authenticated) -> get current user info

## Next steps / Production notes
- Use migrations instead of sync for production.
- Store JWT secret safely and rotate regularly.
- Integrate real payment gateway and webhook verification.
- Use HTTPS and secure cookie storage for tokens (httpOnly).
