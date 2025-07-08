import { Request, Response } from "express";
import pool from "../config/db";
import { RowDataPacket } from "mysql2";

// Create a new purchase
export const createPurchase = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { product_id, quantity, purchase_price } = req.body;

  if (!product_id || !quantity || !purchase_price) {
    res.status(400).json({ message: "All fields are required." });
    return;
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Insert purchase
    const [result] = await connection.query(
      `INSERT INTO purchases (product_id, quantity, purchase_price, purchase_date)
       VALUES (?, ?, ?, NOW())`,
      [product_id, quantity, purchase_price]
    );

    // Update product stock
    await connection.query(
      `UPDATE products SET stock = stock + ? WHERE id = ?`,
      [quantity, product_id]
    );

    await connection.commit();
    connection.release();

    res.status(201).json({
      success: true,
      purchaseId: (result as any).insertId,
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Create Purchase Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get all purchases
export const listPurchases = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.product_id, pr.name AS product_name, pr.unit,
              p.quantity, p.purchase_price, p.purchase_date
       FROM purchases p
       JOIN products pr ON p.product_id = pr.id
       ORDER BY p.purchase_date DESC`
    );

    res.status(200).json({ success: true, purchases: rows });
  } catch (error) {
    console.error("List Purchases Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get one purchase
export const getPurchase = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.product_id, pr.name AS product_name, pr.unit,
              p.quantity, p.purchase_price, p.purchase_date
       FROM purchases p
       JOIN products pr ON p.product_id = pr.id
       WHERE p.id = ?`,
      [id]
    );

    const purchase = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!purchase) {
      res.status(404).json({ message: "Purchase not found" });
      return;
    }

    res.status(200).json({ success: true, purchase });
  } catch (error) {
    console.error("Get Purchase Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update a purchase with stock handling
export const updatePurchase = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { product_id, quantity, purchase_price } = req.body;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT * FROM purchases WHERE id = ?",
      [id]
    );

    const originalPurchase = rows[0];

    if (!originalPurchase) {
      connection.release();
      res.status(404).json({ message: "Purchase not found" });
      return;
    }

    const oldQty = originalPurchase.quantity;
    const oldProductId = originalPurchase.product_id;

    // 1. Reverse old quantity
    await connection.query(
      `UPDATE products SET stock = stock - ? WHERE id = ?`,
      [oldQty, oldProductId]
    );

    // 2. Apply new quantity
    await connection.query(
      `UPDATE products SET stock = stock + ? WHERE id = ?`,
      [quantity, product_id]
    );

    // 3. Update purchase record
    await connection.query(
      `UPDATE purchases
       SET product_id = ?, quantity = ?, purchase_price = ?
       WHERE id = ?`,
      [product_id, quantity, purchase_price, id]
    );

    await connection.commit();
    connection.release();

    res
      .status(200)
      .json({ success: true, message: "Purchase updated successfully" });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Update Purchase Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Delete a purchase with stock rollback
export const deletePurchase = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT * FROM purchases WHERE id = ?",
      [id]
    );

    const purchase = rows[0];

    if (!purchase) {
      connection.release();
      res.status(404).json({ message: "Purchase not found" });
      return;
    }

    const { product_id, quantity } = purchase;

    // 1. Subtract stock
    await connection.query(
      `UPDATE products SET stock = stock - ? WHERE id = ?`,
      [quantity, product_id]
    );

    // 2. Delete record
    await connection.query("DELETE FROM purchases WHERE id = ?", [id]);

    await connection.commit();
    connection.release();

    res
      .status(200)
      .json({ success: true, message: "Purchase deleted successfully" });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Delete Purchase Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
