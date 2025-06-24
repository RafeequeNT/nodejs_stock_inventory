import express from "express";
import dotenv from "dotenv";
import userRoutes from "./routes/user.router";
import indexRouter from "./routes/index";
import passport from "passport";

dotenv.config();
const app = express();
app.use(passport.initialize());

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/", indexRouter);

app.use("/users", userRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
