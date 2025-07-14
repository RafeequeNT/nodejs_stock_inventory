import express from "express";
import dotenv from "dotenv";
import userRoutes from "./routes/user.router";
import productRoutes from "./routes/product.router";
import purchasetRoutes from "./routes/purchase.router";
import salesRouter from "./routes/sales.router";
import priceRouter from "./routes/price.router";
import paymentRouter from "./routes/payment.router";

import indexRouter from "./routes/index";
import passport from "passport";
import pool from "./config/db";
import corsWithOptions from "./routes/cors";

dotenv.config();
const app = express();

app.use(corsWithOptions);
// app.options("/*", corsWithOptions);

app.use(passport.initialize());

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/", indexRouter);

app.use("/users", userRoutes);
app.use("/products", productRoutes);
app.use("/purchases", purchasetRoutes);
app.use("/sales", salesRouter);
app.use("/prices", priceRouter);
app.use("/payments", paymentRouter);

// Test MySQL connection before starting server
pool
  .getConnection()
  .then((connection) => {
    console.log("✅ Connected to MySQL database");

    // Always release the connection after test
    connection.release();

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MySQL connection failed:", err.message);
    process.exit(1); // Exit process if DB connection fails
  });

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
