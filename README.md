# Flour Mill Sales Management System

A full-featured backend application for managing sales, credit transactions, product pricing, stock updates, and customer payments in a flour mill business. Built with **Node.js (Express)** and **MySQL**, this system supports multi-product sales, partial/full payments, credit handling, and real-time stock updates.

---

## 🚀 Features

- 📦 **Product Management**: Track multiple products and their stock.
- 💰 **Sales Management**: Handle multi-item sales, store customer info.
- 📉 **Price History**: Maintain pricing history with `product_prices`.
- 📊 **Credit Sales Tracking**: Track full credit, partial payments, and fully paid sales.
- 💵 **Payment Management**: Add, list, and delete payments for any sale.
- 🔄 **Auto Payment Status Updates**: Automatically updates status (`credit`, `partial`, `paid`) based on payment.
- 🧾 **Balance Reports**: View remaining balance for credit/partial customers.
- 🔐 **Authentication Middleware**: Secure endpoints with admin/user roles.

---

## 🧱 Database Tables

1. `products`
2. `product_prices`
3. `sales`
4. `sale_items`
5. `sale_payments`
6. `purchases`
7. `users`

---

## 📦 API Overview

### 🔹 Products

- `GET /api/products`
- `POST /api/products`
- `PATCH /api/products/:id`
- `DELETE /api/products/:id`

### 🔹 Prices

- `POST /api/prices/` (Add new price)
- `GET /api/prices/:product_id` (Get price history)

### 🔹 Sales

- `POST /api/sales/` (Create sale without initial payment)
- `GET /api/sales/` (List all sales)
- `GET /api/sales/:id` (Get sale with items)
- `PATCH /api/sales/:id`
- `DELETE /api/sales/:id`

### 🔹 Payments

- `POST /api/payments/` (Add payment)
- `GET /api/payments/:sale_id` (List payments for a sale)
- `DELETE /api/payments/:payment_id` (Delete a payment)

### 🔹 Credit Management

- `GET /api/sales/credits` (List credit/partial sales with remaining balance)

---
