import express from "express";
import * as salesController from "../controllers/sales.controller";
import bodyParser from "body-parser";
import * as authenticate from "../authenticate";
import { corsWithOptions } from "./cors";

const router = express.Router();
router.use(bodyParser.json());

// Create sale
router.post(
  "/",
  corsWithOptions,
  authenticate.verifyUser,
  salesController.createSale
);

router.get(
  "/credits",
  corsWithOptions,
  authenticate.verifyUser,
  salesController.getCreditSalesWithBalance
);

// List all sales
router.get(
  "/",
  corsWithOptions,
  authenticate.verifyUser,
  salesController.listSales
);

// Get single sale
router.get(
  "/:id",
  corsWithOptions,
  authenticate.verifyUser,
  salesController.getSale
);

// Update sale (Admin only)
router.put(
  "/:id",
  corsWithOptions,
  authenticate.verifyUser,
  salesController.updateSale
);

// Delete sale (Admin only)
router.delete(
  "/:id",
  corsWithOptions,
  authenticate.verifyUser,
  authenticate.verifyAdmin,
  salesController.deleteSale
);

export default router;
