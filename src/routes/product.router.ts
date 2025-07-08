import express from "express";
import * as productController from "../controllers/product.controller";
import bodyParser from "body-parser";
import * as authenticate from "../authenticate";
import { corsWithOptions } from "./cors";

const router = express.Router();
router.use(bodyParser.json());

// Create product (Admin only)
router.post(
  "/",
  corsWithOptions,
  authenticate.verifyUser,
  authenticate.verifyAdmin,
  productController.createProduct
);

// Get paginated list of products (Any user)
router.get(
  "/",
  corsWithOptions,
  authenticate.verifyUser,
  productController.listProducts
);

// Get single product by ID
router.get(
  "/:id",
  corsWithOptions,
  authenticate.verifyUser,
  productController.getProduct
);

// Update product (Admin only)
router.put(
  "/:id",
  corsWithOptions,
  authenticate.verifyUser,
  authenticate.verifyAdmin,
  productController.updateProduct
);

// Delete product (Admin only)
router.delete(
  "/:id",
  corsWithOptions,
  authenticate.verifyUser,
  authenticate.verifyAdmin,
  productController.deleteProduct
);

export default router;
