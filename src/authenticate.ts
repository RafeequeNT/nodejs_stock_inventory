import passport from "passport";
import {
  Strategy as JwtStrategy,
  ExtractJwt,
  StrategyOptions,
} from "passport-jwt";
import { Strategy as LocalStrategy } from "passport-local";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction, RequestHandler } from "express";
import IUser from "./models/user.model";

// Dummy user
const DUMMY_USER = {
  id: "1",
  username: "john",
  password: "password",
  admin: true,
};

// Secret key
const secretKey = "mysecretkey";

// Local Strategy
passport.use(
  new LocalStrategy((username, password, done) => {
    if (username === DUMMY_USER.username && password === DUMMY_USER.password) {
      return done(null, DUMMY_USER);
    } else {
      return done(null, false, { message: "Invalid credentials" });
    }
  })
);

// JWT Strategy
const jwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: secretKey,
};

passport.use(
  new JwtStrategy(jwtOptions, (jwtPayload, done) => {
    if (jwtPayload.username === DUMMY_USER.username) {
      return done(null, DUMMY_USER);
    } else {
      return done(null, false);
    }
  })
);

// Create Token
export const getToken = (user: { id: string; username: string }) =>
  jwt.sign(user, secretKey, { expiresIn: "1h" });

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
