import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
// import authenticate from "../authenticate";
import * as authenticate from "../authenticate";
import { corsWithOptions } from "./cors";
var passport = require("passport");

const router = express.Router();
router.use(bodyParser.json());

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
