import passport from "passport";
import {
  Strategy as JwtStrategy,
  ExtractJwt,
  StrategyOptions,
} from "passport-jwt";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction, RequestHandler } from "express";
import IUser from "./models/user.model";
// import dotenv from "dotenv";
import pool from "./config/db";

// Secret key
const secretKey = process.env.ACCESS_SECRET || "defaultsecret";

const refreshSecret = process.env.REFRESH_SECRET || "refreshsecret";

// JWT Strategy
const jwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: secretKey,
};

// 👇 JWT Strategy using MySQL
passport.use(
  new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
    try {
      const [rows] = await pool.query(
        "SELECT id, username,admin FROM users WHERE id = ?",
        [jwtPayload.id]
      );
      const user = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

      if (user) return done(null, user);
      else return done(null, false);
    } catch (err) {
      return done(err, false);
    }
  })
);

// Create Token
export const getToken = (user: { id: string; username: string }) =>
  jwt.sign(user, secretKey, { expiresIn: "1h" });

// Generate refresh token
export const getRefreshToken = (user: { id: string; username: string }) =>
  jwt.sign(user, refreshSecret, { expiresIn: "7d" });

// Middlewares
export const verifyUser: RequestHandler = passport.authenticate("jwt", {
  session: false,
});

export const verifyAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if ((req.user as IUser)?.admin) {
    next();
  } else {
    res.status(403).json({ message: "Admins only!" });
  }
};

// Export passport instance too
export { passport };
