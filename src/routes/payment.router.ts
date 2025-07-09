import express from "express";
import bodyParser from "body-parser";
import * as paymentController from "../controllers/payment.controller";
import * as authenticate from "../authenticate";
import { corsWithOptions } from "./cors";

const router = express.Router();
router.use(bodyParser.json());

// Add a payment for a sale (authenticated user)
router.post(
  "/",
  corsWithOptions,
  authenticate.verifyUser,
  paymentController.addPayment
);

// Get all payments for a specific sale (authenticated user)
router.get(
  "/:sale_id",
  corsWithOptions,
  authenticate.verifyUser,
  paymentController.listPaymentsForSale
);

// Delete a payment
router.delete(
  "/:payment_id",
  corsWithOptions,
  authenticate.verifyUser,
  authenticate.verifyAdmin,
  paymentController.deletePayment
);

export default router;
