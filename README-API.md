# DigiStore API Documentation

## Overview
This document provides comprehensive API documentation for the DigiStore backend. The API follows RESTful conventions and uses JWT for authentication.

**Base URL**: `http://localhost:4002`

**Authentication**: Bearer Token (JWT) required for protected endpoints

## Table of Contents
1. [Authentication](#authentication)
2. [Products](#products)
3. [Orders](#orders)
4. [Digital Keys](#digital-keys)
5. [Users](#users)
6. [Common Responses](#common-responses)
7. [Error Codes](#error-codes)

---

## Authentication

### Register User
Create a new user account.

**Endpoint**: `POST /auth/register`

**Authentication**: None required

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response** (201):
```json
{
  "user": {
    "id": 1,
    "email": "john@example.com",
    "role": "customer",
    "name": "John Doe",
    "emailConfirmed": false
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:
- `400 Bad Request`: Missing fields, invalid email, or email already exists
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl -X POST http://localhost:4002/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'
```

---

### Login User
Authenticate user and receive JWT token.

**Endpoint**: `POST /auth/login`

**Authentication**: None required

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "user": {
    "id": 1,
    "email": "john@example.com",
    "role": "customer",
    "name": "John Doe",
    "emailConfirmed": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:
- `400 Bad Request`: Missing fields, invalid credentials
- `403 Forbidden`: Email not confirmed (if confirmation required)
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl -X POST http://localhost:4002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

---

### Confirm Email
Confirm user email with verification code.

**Endpoint**: `POST /auth/confirm`

**Authentication**: None required

**Request Body**:
```json
{
  "email": "john@example.com",
  "code": "123456"
}
```

**Response** (200):
```json
{
  "ok": true,
  "message": "Email confirmed"
}
```

**Error Responses**:
- `400 Bad Request`: Missing fields, invalid code, or code expired
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl -X POST http://localhost:4002/auth/confirm \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","code":"123456"}'
```

---

### Resend Confirmation Code
Resend email confirmation code.

**Endpoint**: `POST /auth/resend-confirm`

**Authentication**: None required

**Request Body**:
```json
{
  "email": "john@example.com"
}
```

**Response** (200):
```json
{
  "ok": true,
  "message": "Confirmation code sent (if email sending enabled)"
}
```

**Error Responses**:
- `400 Bad Request`: Missing fields or email already confirmed
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl -X POST http://localhost:4002/auth/resend-confirm \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com"}'
```

---

### Forgot Password
Initiate password reset process.

**Endpoint**: `POST /auth/forgot-password`

**Authentication**: None required

**Request Body**:
```json
{
  "email": "john@example.com"
}
```

**Response** (200):
```json
{
  "ok": true,
  "message": "Password reset link sent (if email enabled)"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid email
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl -X POST http://localhost:4002/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com"}'
```

---

### Reset Password
Reset password using reset token.

**Endpoint**: `POST /auth/reset-password`

**Authentication**: None required

**Request Body**:
```json
{
  "token": "reset-token-here",
  "newPassword": "newpassword123"
}
```

**Response** (200):
```json
{
  "ok": true,
  "message": "Password reset successful"
}
```

**Error Responses**:
- `400 Bad Request`: Missing fields, invalid/expired token, or password too short
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl -X POST http://localhost:4002/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"reset-token-here","newPassword":"newpassword123"}'
```

---

## Products

### Get All Products
Retrieve list of all active products.

**Endpoint**: `GET /products`

**Authentication**: None required

**Response** (200):
```json
[
  {
    "id": 1,
    "name": "Microsoft Office 2024 Professional",
    "description": "Complete productivity suite...",
    "price": "299.99",
    "quantity": 50,
    "logo": "https://example.com/logos/office2024.png",
    "isActive": true,
    "keys": []
  }
]
```

**Error Responses**:
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl http://localhost:4002/products
```

---

### Get Single Product
Retrieve details of a specific product.

**Endpoint**: `GET /products/:id`

**Authentication**: None required

**Parameters**:
- `id` (path): Product ID

**Response** (200):
```json
{
  "id": 1,
  "name": "Microsoft Office 2024 Professional",
  "description": "Complete productivity suite...",
  "instructions": "1. Download the installer...",
  "price": "299.99",
  "quantity": 50,
  "logo": "https://example.com/logos/office2024.png",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses**:
- `404 Not Found`: Product not found
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl http://localhost:4002/products/1
```

---

### Create Product
Create a new product (Admin only).

**Endpoint**: `POST /products`

**Authentication**: Required (Admin role)

**Request Body**:
```json
{
  "name": "New Product",
  "description": "Product description",
  "instructions": "Installation instructions",
  "price": 99.99,
  "quantity": 10,
  "logo": "https://example.com/logo.png"
}
```

**Response** (201):
```json
{
  "id": 11,
  "name": "New Product",
  "description": "Product description",
  "instructions": "Installation instructions",
  "price": "99.99",
  "quantity": 10,
  "logo": "https://example.com/logo.png",
  "isActive": true,
  "updatedAt": "2024-01-30T00:00:00.000Z",
  "createdAt": "2024-01-30T00:00:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request`: Name and price required
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Admin role required
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl -X POST http://localhost:4002/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"name":"New Product","description":"Product description","instructions":"Installation instructions","price":99.99,"quantity":10,"logo":"https://example.com/logo.png"}'
```

---

### Update Product
Update product details (Admin only).

**Endpoint**: `PUT /products/:id`

**Authentication**: Required (Admin role)

**Parameters**:
- `id` (path): Product ID

**Request Body**:
```json
{
  "name": "Updated Product Name",
  "price": 149.99,
  "quantity": 15,
  "isActive": false
}
```

**Response** (200):
```json
{
  "id": 1,
  "name": "Updated Product Name",
  "description": "Complete productivity suite...",
  "instructions": "1. Download the installer...",
  "price": "149.99",
  "quantity": 15,
  "logo": "https://example.com/logos/office2024.png",
  "isActive": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-30T00:00:00.000Z"
}
```

**Error Responses**:
- `404 Not Found`: Product not found
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Admin role required
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl -X PUT http://localhost:4002/products/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"name":"Updated Product Name","price":149.99,"quantity":15,"isActive":false}'
```

---

### Delete Product
Delete a product (Admin only).

**Endpoint**: `DELETE /products/:id`

**Authentication**: Required (Admin role)

**Parameters**:
- `id` (path): Product ID

**Response** (204): No content

**Error Responses**:
- `404 Not Found`: Product not found
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Admin role required
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl -X DELETE http://localhost:4002/products/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### Add Digital Keys to Product
Add digital license keys to a product (Admin only).

**Endpoint**: `POST /products/:id/keys`

**Authentication**: Required (Admin role)

**Parameters**:
- `id` (path): Product ID

**Request Body**:
```json
{
  "keys": [
    "XXXXX-XXXXX-XXXXX-XXXXX-0001",
    "XXXXX-XXXXX-XXXXX-XXXXX-0002"
  ]
}
```

**Response** (200):
```json
{
  "message": "Keys added",
  "keys": [
    {
      "id": 21,
      "keyValue": "XXXXX-XXXXX-XXXXX-XXXXX-0001",
      "isAssigned": false,
      "assignedToOrderId": null,
      "productId": 1,
      "updatedAt": "2024-01-30T00:00:00.000Z",
      "createdAt": "2024-01-30T00:00:00.000Z"
    },
    {
      "id": 22,
      "keyValue": "XXXXX-XXXXX-XXXXX-XXXXX-0002",
      "isAssigned": false,
      "assignedToOrderId": null,
      "productId": 1,
      "updatedAt": "2024-01-30T00:00:00.000Z",
      "createdAt": "2024-01-30T00:00:00.000Z"
    }
  ]
}
```

**Error Responses**:
- `404 Not Found`: Product not found
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Admin role required
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl -X POST http://localhost:4002/products/1/keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"keys":["XXXXX-XXXXX-XXXXX-XXXXX-0001","XXXXX-XXXXX-XXXXX-XXXXX-0002"]}'
```

---

### Get Product Keys
Get all digital keys for a product (Admin only).

**Endpoint**: `GET /products/:id/keys`

**Authentication**: Required (Admin role)

**Parameters**:
- `id` (path): Product ID

**Response** (200):
```json
[
  {
    "id": 1,
    "keyValue": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
    "isAssigned": true,
    "assignedToOrderId": 1,
    "productId": 1,
    "createdAt": "2024-01-10T00:00:00.000Z",
    "updatedAt": "2024-01-10T00:00:00.000Z"
  }
]
```

**Error Responses**:
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Admin role required
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl http://localhost:4002/products/1/keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Orders

### Create Order
Create a new order for a product.

**Endpoint**: `POST /orders`

**Authentication**: Required

**Request Body**:
```json
{
  "productId": 1
}
```

**Response** (201):
```json
{
  "id": 13,
  "userId": 2,
  "productId": 1,
  "status": "pending",
  "paymentMethod": null,
  "transactionId": null,
  "paymentSender": null,
  "updatedAt": "2024-01-30T00:00:00.000Z",
  "createdAt": "2024-01-30T00:00:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request`: Product not found or out of stock
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl -X POST http://localhost:4002/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CUSTOMER_TOKEN" \
  -d '{"productId":1}'
```

---

### Get Orders
Retrieve orders. Admins see all orders, customers see only their own.

**Endpoint**: `GET /orders`

**Authentication**: Required

**Response** (200) - Admin:
```json
[
  {
    "id": 1,
    "userId": 2,
    "productId": 1,
    "status": "paid",
    "paymentMethod": "Credit Card",
    "transactionId": "TXN-001-2024",
    "paymentSender": "John Doe",
    "createdAt": "2024-01-10T00:00:00.000Z",
    "updatedAt": "2024-01-10T00:00:00.000Z",
    "product": {
      "id": 1,
      "name": "Microsoft Office 2024 Professional",
      "description": "Complete productivity suite...",
      "price": "299.99",
      "quantity": 49,
      "logo": "https://example.com/logos/office2024.png",
      "isActive": true
    },
    "user": {
      "id": 2,
      "name": "John Doe",
      "email": "john@example.com"
    },
    "keys": [
      {
        "id": 1,
        "keyValue": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
        "isAssigned": true,
        "assignedToOrderId": 1,
        "productId": 1,
        "createdAt": "2024-01-10T00:00:00.000Z",
        "updatedAt": "2024-01-10T00:00:00.000Z"
      }
    ]
  }
]
```

**Response** (200) - Customer:
```json
[
  {
    "id": 1,
    "userId": 2,
    "productId": 1,
    "status": "paid",
    "paymentMethod": "Credit Card",
    "transactionId": "TXN-001-2024",
    "paymentSender": "John Doe",
    "createdAt": "2024-01-10T00:00:00.000Z",
    "updatedAt": "2024-01-10T00:00:00.000Z",
    "product": {
      "id": 1,
      "name": "Microsoft Office 2024 Professional",
      "description": "Complete productivity suite...",
      "price": "299.99",
      "quantity": 49,
      "logo": "https://example.com/logos/office2024.png",
      "isActive": true
    },
    "keys": [
      {
        "id": 1,
        "keyValue": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
        "isAssigned": true,
        "assignedToOrderId": 1,
        "productId": 1,
        "createdAt": "2024-01-10T00:00:00.000Z",
        "updatedAt": "2024-01-10T00:00:00.000Z"
      }
    ]
  }
]
```

**Error Responses**:
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl http://localhost:4002/orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Submit Payment Information
Submit payment details for an order.

**Endpoint**: `POST /orders/:id/payment`

**Authentication**: Required

**Parameters**:
- `id` (path): Order ID

**Request Body**:
```json
{
  "method": "Credit Card",
  "trxId": "TXN-013-2024",
  "sender": "John Doe"
}
```

**Response** (200):
```json
{
  "id": 13,
  "userId": 2,
  "productId": 1,
  "status": "awaiting_confirmation",
  "paymentMethod": "Credit Card",
  "transactionId": "TXN-013-2024",
  "paymentSender": "John Doe",
  "createdAt": "2024-01-30T00:00:00.000Z",
  "updatedAt": "2024-01-30T00:00:00.000Z"
}
```

**Error Responses**:
- `403 Forbidden`: Order does not belong to user
- `404 Not Found`: Order not found
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl -X POST http://localhost:4002/orders/13/payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CUSTOMER_TOKEN" \
  -d '{"method":"Credit Card","trxId":"TXN-013-2024","sender":"John Doe"}'
```

---

### Confirm Payment (Admin)
Confirm payment for an order (Admin only).

**Endpoint**: `POST /orders/:id/confirm-payment`

**Authentication**: Required (Admin role)

**Parameters**:
- `id` (path): Order ID

**Response** (200):
```json
{
  "message": "Payment confirmed. Keys/details will be assigned soon.",
  "order": {
    "id": 13,
    "userId": 2,
    "productId": 1,
    "status": "paid",
    "paymentMethod": "Credit Card",
    "transactionId": "TXN-013-2024",
    "paymentSender": "John Doe",
    "createdAt": "2024-01-30T00:00:00.000Z",
    "updatedAt": "2024-01-30T00:00:00.000Z"
  }
}
```

**Error Responses**:
- `404 Not Found`: Order not found
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Admin role required
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl -X POST http://localhost:4002/orders/13/confirm-payment \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### Mark Paid and Assign Keys (Admin)
Mark order as paid and assign digital keys (Admin only).

**Endpoint**: `POST /orders/:id/mark-paid`

**Authentication**: Required (Admin role)

**Parameters**:
- `id` (path): Order ID

**Request Body**:
```json
{
  "keys": [
    "NEW-KEY-001",
    "NEW-KEY-002"
  ]
}
```

**Response** (200):
```json
{
  "id": 13,
  "userId": 2,
  "productId": 1,
  "status": "paid",
  "paymentMethod": "Credit Card",
  "transactionId": "TXN-013-2024",
  "paymentSender": "John Doe",
  "createdAt": "2024-01-30T00:00:00.000Z",
  "updatedAt": "2024-01-30T00:00:00.000Z"
}
```

**Error Responses**:
- `404 Not Found`: Order not found
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Admin role required
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl -X POST http://localhost:4002/orders/13/mark-paid \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"keys":["NEW-KEY-001","NEW-KEY-002"]}'
```

---

### Assign Keys (Admin)
Assign digital keys to a paid order (Admin only).

**Endpoint**: `POST /orders/:id/assign-keys`

**Authentication**: Required (Admin role)

**Parameters**:
- `id` (path): Order ID

**Request Body**:
```json
{
  "keys": [
    "ASSIGNED-KEY-001",
    "ASSIGNED-KEY-002"
  ]
}
```

**Response** (200):
```json
{
  "message": "Keys assigned successfully",
  "order": {
    "id": 13,
    "userId": 2,
    "productId": 1,
    "status": "paid",
    "paymentMethod": "Credit Card",
    "transactionId": "TXN-013-2024",
    "paymentSender": "John Doe",
    "createdAt": "2024-01-30T00:00:00.000Z",
    "updatedAt": "2024-01-30T00:00:00.000Z",
    "product": {
      "id": 1,
      "name": "Microsoft Office 2024 Professional",
      "description": "Complete productivity suite...",
      "price": "299.99",
      "quantity": 47,
      "logo": "https://example.com/logos/office2024.png",
      "isActive": true
    },
    "keys": [
      {
        "id": 23,
        "keyValue": "ASSIGNED-KEY-001",
        "isAssigned": true,
        "assignedToOrderId": 13,
        "productId": 1,
        "createdAt": "2024-01-30T00:00:00.000Z",
        "updatedAt": "2024-01-30T00:00:00.000Z"
      },
      {
        "id": 24,
        "keyValue": "ASSIGNED-KEY-002",
        "isAssigned": true,
        "assignedToOrderId": 13,
        "productId": 1,
        "createdAt": "2024-01-30T00:00:00.000Z",
        "updatedAt": "2024-01-30T00:00:00.000Z"
      }
    ],
    "user": {
      "id": 2,
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

**Error Responses**:
- `400 Bad Request`: Order must be marked as paid first
- `404 Not Found`: Order not found
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Admin role required
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl -X POST http://localhost:4002/orders/13/assign-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"keys":["ASSIGNED-KEY-001","ASSIGNED-KEY-002"]}'
```

---

## Digital Keys

### Get All Keys (Admin)
Retrieve all digital keys with product and order associations (Admin only).

**Endpoint**: `GET /keys`

**Authentication**: Required (Admin role)

**Response** (200):
```json
[
  {
    "id": 1,
    "keyValue": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
    "isAssigned": true,
    "assignedToOrderId": 1,
    "productId": 1,
    "createdAt": "2024-01-10T00:00:00.000Z",
    "updatedAt": "2024-01-10T00:00:00.000Z",
    "product": {
      "id": 1,
      "name": "Microsoft Office 2024 Professional",
      "description": "Complete productivity suite...",
      "price": "299.99",
      "quantity": 49,
      "logo": "https://example.com/logos/office2024.png",
      "isActive": true
    },
    "order": {
      "id": 1,
      "userId": 2,
      "productId": 1,
      "status": "paid",
      "paymentMethod": "Credit Card",
      "transactionId": "TXN-001-2024",
      "paymentSender": "John Doe",
      "createdAt": "2024-01-10T00:00:00.000Z",
      "updatedAt": "2024-01-10T00:00:00.000Z"
    }
  }
]
```

**Error Responses**:
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Admin role required
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl http://localhost:4002/keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### Revoke Key (Admin)
Revoke/release a digital key, making it available for reassignment (Admin only).

**Endpoint**: `PUT /keys/:id/revoke`

**Authentication**: Required (Admin role)

**Parameters**:
- `id` (path): Digital Key ID

**Response** (200):
```json
{
  "message": "Key revoked",
  "key": {
    "id": 1,
    "keyValue": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
    "isAssigned": false,
    "assignedToOrderId": null,
    "productId": 1,
    "createdAt": "2024-01-10T00:00:00.000Z",
    "updatedAt": "2024-01-30T00:00:00.000Z"
  }
}
```

**Error Responses**:
- `404 Not Found`: Key not found
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Admin role required
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl -X PUT http://localhost:4002/keys/1/revoke \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Users

### Get Current User
Get information about the currently authenticated user.

**Endpoint**: `GET /users/me`

**Authentication**: Required

**Response** (200):
```json
{
  "id": 2,
  "email": "john@example.com",
  "role": "customer"
}
```

**Error Responses**:
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl http://localhost:4002/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Create User (Admin)
Create a new user with specified role (Admin only).

**Endpoint**: `POST /users`

**Authentication**: Required (Admin role)

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "role": "customer"
}
```

**Response** (201):
```json
{
  "id": 6,
  "email": "newuser@example.com",
  "role": "customer"
}
```

**Error Responses**:
- `400 Bad Request`: Missing fields, invalid role, or user already exists
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Admin role required
- `500 Internal Server Error`: Server error

**cURL Example**:
```bash
curl -X POST http://localhost:4002/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"email":"newuser@example.com","password":"password123","role":"customer"}'
```

---

## Common Responses

### Success Responses
- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `204 No Content`: Resource deleted successfully

### Error Responses
- `400 Bad Request`: Invalid request data or missing parameters
- `401 Unauthorized`: Authentication required or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

### Standard Error Format
```json
{
  "error": "Error message describing the issue"
}
```

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 400 | Bad Request | The request is invalid or missing required parameters |
| 401 | Unauthorized | Authentication is required or the token is invalid |
| 403 | Forbidden | The user does not have permission to access the resource |
| 404 | Not Found | The requested resource does not exist |
| 500 | Internal Server Error | An unexpected error occurred on the server |

---

## Authentication Flow

1. **Register**: Create a new user account via `POST /auth/register`
2. **Login**: Obtain JWT token via `POST /auth/login`
3. **Use Token**: Include the token in the Authorization header for protected endpoints:
   ```
   Authorization: Bearer YOUR_JWT_TOKEN
   ```
4. **Refresh**: Tokens expire after 7 days, login again to get a new token

---

## Testing with Seed Data

After running `npm run setup`, you can test the API with these credentials:

### Admin User
- **Email**: `admin@digistore.com`
- **Password**: `admin123`

### Customer Users
- **Email**: `john@example.com` / **Password**: `customer123`
- **Email**: `jane@example.com` / **Password**: `customer123`
- **Email**: `bob@example.com` / **Password**: `customer123`

### Example Testing Sequence

1. **Login as admin** and get token
2. **Create a product** using the admin token
3. **Add digital keys** to the product
4. **Login as customer** and get token
5. **Create an order** for the product
6. **Submit payment** for the order
7. **Login as admin** and confirm payment
8. **Assign keys** to the order
9. **View orders** as customer to see assigned keys

---

## Rate Limiting

Currently, no rate limiting is implemented. Consider adding rate limiting for production use.

---

## CORS

The API is configured to accept requests from all origins (`*`). For production, update the CORS configuration to allow only specific origins.

---

## Environment Variables

Key environment variables that affect API behavior:

- `EMAIL_CONFIRMATION_ENABLED`: Enable email confirmation (`true`/`false`)
- `EMAIL_CONFIRMATION_REQUIRED`: Require email confirmation for login (`true`/`false`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Email configuration
- `FRONTEND_URL`: Base URL for password reset links

---

## Version History

- **v1.0.0**: Initial API release with full CRUD operations for products, orders, and user management
