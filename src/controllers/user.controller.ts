// controllers/user.controller.ts
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db";
import * as authenticate from "../authenticate";
import { RowDataPacket } from "mysql2";

const refreshSecret = process.env.REFRESH_SECRET || "refreshsecret";

export const signupUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { username, password, firstname, lastname } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required." });
    return;
  }

  try {
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
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );
    const user = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const token = authenticate.getToken({
      id: user.id,
      username: user.username,
    });
    const refreshToken = authenticate.getRefreshToken({
      id: user.id,
      username: user.username,
    });

    await pool.query("UPDATE users SET refresh_token = ? WHERE id = ?", [
      refreshToken,
      user.id,
    ]);

    res.status(200).json({
      success: true,
      token,
      refreshToken,
      status: `Welcome, ${user.firstname || user.username}!`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const refreshAccessToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ message: "Refresh token required" });
    return;
  }

  try {
    const decoded: any = jwt.verify(refreshToken, refreshSecret);
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM users WHERE id = ? AND refresh_token = ?",
      [decoded.id, refreshToken]
    );
    const user = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!user) {
      res.status(403).json({ message: "Invalid refresh token" });
      return;
    }

    const newAccessToken = authenticate.getToken({
      id: user.id,
      username: user.username,
    });
    res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    console.error("Refresh token error:", err);
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = req.user as any;

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, username, firstname, lastname, admin FROM users WHERE id = ?",
      [user.id]
    );

    const userData = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!userData) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ success: true, user: userData });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      "SELECT id, username, firstname, lastname FROM users LIMIT ? OFFSET ?",
      [limit, offset]
    );
    const [countResult] = await pool.query(
      "SELECT COUNT(*) as total FROM users"
    );
    const total = (countResult as any)[0].total;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      currentPage: page,
      totalPages,
      totalUsers: total,
      users: rows,
    });
  } catch (err) {
    console.error("Error fetching paginated users:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
