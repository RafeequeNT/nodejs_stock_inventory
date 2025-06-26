import express from "express";
import dotenv from "dotenv";
import userRoutes from "./routes/user.router";
import indexRouter from "./routes/index";
import passport from "passport";
import pool from "./config/db";

dotenv.config();
const app = express();
app.use(passport.initialize());

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/", indexRouter);

app.use("/users", userRoutes);

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
