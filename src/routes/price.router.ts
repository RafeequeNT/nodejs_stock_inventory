import express from "express";
import bodyParser from "body-parser";
import * as priceController from "../controllers/price.controller";
import * as authenticate from "../authenticate";
import { corsWithOptions } from "./cors";

const router = express.Router();
router.use(bodyParser.json());

// Create new price record (admin only)
router.post(
  "/",
  corsWithOptions,
  authenticate.verifyUser,
  authenticate.verifyAdmin,
  priceController.addPrice
);

// Get price history for a product (with optional date range and pagination)
router.get(
  "/:product_id",
  corsWithOptions,
  authenticate.verifyUser,
  priceController.listPrices
);

export default router;
