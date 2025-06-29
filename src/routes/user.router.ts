import express from "express";
import bodyParser from "body-parser";
import * as authenticate from "../authenticate";
import { corsWithOptions } from "./cors";
import * as userController from "../controllers/user.controller";

const router = express.Router();
router.use(bodyParser.json());

// Routes
router.post("/signup", userController.signupUser);
router.post("/login", corsWithOptions, userController.loginUser);
router.post("/refresh", userController.refreshAccessToken);
router.get(
  "/",
  authenticate.verifyUser,
  authenticate.verifyAdmin,
  corsWithOptions,
  userController.listUsers
);
router.get(
  "/me",
  authenticate.verifyUser,
  corsWithOptions,
  userController.getCurrentUser
);

export default router;
