import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
// import authenticate from "../authenticate";
import * as authenticate from "../authenticate";
import { corsWithOptions } from "./cors";
var passport = require("passport");

const router = express.Router();
router.use(bodyParser.json());
import bcrypt from "bcrypt";

import pool from "../config/db";

interface SignupRequestBody {
  username: string;
  password: string;
  firstname?: string;
  lastname?: string;
}

// POST /users/signup
router.post(
  "/signup",
  async (
    req: Request<{}, {}, SignupRequestBody>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { username, password, firstname, lastname } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: "Username and password are required." });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [result] = await pool.query(
        `INSERT INTO users (username, password, firstname, lastname)
         VALUES (?, ?, ?, ?)`,
        [username, hashedPassword, firstname || null, lastname || null]
      );

      res.status(201).json({
        success: true,
        message: "User registered successfully.",
        userId: (result as any).insertId,
      });
    } catch (error: any) {
      if (error.code === "ER_DUP_ENTRY") {
        res.status(409).json({ error: "Username already exists." });
      } else {
        console.error("Signup Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  }
);

router.post(
  "/login",
  corsWithOptions,
  passport.authenticate("local", { session: false }),
  (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication failed" });
      return;
    }
    const user = req.user as any;

    const token = authenticate.getToken({
      id: user._id,
      username: user.username,
    });
    res.status(200).json({
      success: true,
      token,
      status: "You are successfully logged in!",
    });
  }
);

// GET /users - Admin only
router.get(
  "/",
  authenticate.verifyUser,
  // authenticate.verifyAdmin,
  corsWithOptions,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = [
        {
          id: 1,
          username: "john",
          firstname: "John",
          lastname: "Doe",
          admin: true,
        },
        {
          id: 2,
          username: "jane",
          firstname: "Jane",
          lastname: "Smith",
          admin: false,
        },
      ];

      res.status(200).json(users);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
