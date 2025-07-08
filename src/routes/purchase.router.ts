import express from "express";
import * as purchaseController from "../controllers/purchase.controller";
import bodyParser from "body-parser";
import * as authenticate from "../authenticate";
import { corsWithOptions } from "./cors";

const router = express.Router();
router.use(bodyParser.json());

// Create purchase
router.post(
  "/",
  corsWithOptions,
  authenticate.verifyUser,
  purchaseController.createPurchase
);

// List all purchases
router.get(
  "/",
  corsWithOptions,
  authenticate.verifyUser,
  purchaseController.listPurchases
);

// Get single purchase
router.get(
  "/:id",
  corsWithOptions,
  authenticate.verifyUser,
  purchaseController.getPurchase
);

// Update purchase (Admin only)
router.put(
  "/:id",
  corsWithOptions,
  authenticate.verifyUser,
  authenticate.verifyAdmin,
  purchaseController.updatePurchase
);

// Delete purchase (Admin only)
router.delete(
  "/:id",
  corsWithOptions,
  authenticate.verifyUser,
  authenticate.verifyAdmin,
  purchaseController.deletePurchase
);

export default router;
