import { Request, Response } from "express";
import pool from "../config/db";
import { RowDataPacket } from "mysql2";

// Create a new purchase (with multiple items)
export const createPurchase = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { supplier_name, supplier_phone, total_amount, items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res
      .status(400)
      .json({ message: "At least one purchase item is required." });
    return;
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Insert into purchases table
    const [purchaseResult] = await connection.query(
      `INSERT INTO purchases (supplier_name, supplier_phone, total_amount, created_at)
       VALUES (?, ?, ?, NOW())`,
      [supplier_name, supplier_phone, total_amount]
    );

    const purchaseId = (purchaseResult as any).insertId;

    for (const item of items) {
      const { product_id, quantity, purchase_price } = item;

      if (!product_id || !quantity || !purchase_price) {
        throw new Error(
          "Each item must have product_id, quantity, and purchase_price."
        );
      }

      // Insert each item
      await connection.query(
        `INSERT INTO purchase_items (purchase_id, product_id, quantity, purchase_price)
         VALUES (?, ?, ?, ?)`,
        [purchaseId, product_id, quantity, purchase_price]
      );

      // Update stock
      await connection.query(
        `UPDATE products SET stock = stock + ? WHERE id = ?`,
        [quantity, product_id]
      );
    }

    await connection.commit();
    connection.release();

    res.status(201).json({ success: true, purchaseId });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Create Purchase Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// List purchases with items
export const listPurchases = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const [rows] = await pool.query(
      `SELECT p.id AS purchase_id, p.supplier_name, p.supplier_phone, p.total_amount, p.created_at,
              pi.product_id, pr.name AS product_name, pr.unit,
              pi.quantity, pi.purchase_price
       FROM purchases p
       JOIN purchase_items pi ON p.id = pi.purchase_id
       JOIN products pr ON pi.product_id = pr.id
       ORDER BY p.created_at DESC`
    );

    res.status(200).json({ success: true, purchases: rows });
  } catch (error) {
    console.error("List Purchases Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get one purchase with items
export const getPurchase = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT p.id AS purchase_id, p.supplier_name, p.supplier_phone, p.total_amount, p.created_at,
              pi.product_id, pr.name AS product_name, pr.unit,
              pi.quantity, pi.purchase_price
       FROM purchases p
       JOIN purchase_items pi ON p.id = pi.purchase_id
       JOIN products pr ON pi.product_id = pr.id
       WHERE p.id = ?`,
      [id]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(404).json({ message: "Purchase not found" });
      return;
    }

    res.status(200).json({ success: true, purchase: rows });
  } catch (error) {
    console.error("Get Purchase Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Delete a purchase and rollback stock
export const deletePurchase = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [items] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM purchase_items WHERE purchase_id = ?`,
      [id]
    );

    for (const item of items) {
      await connection.query(
        `UPDATE products SET stock = stock - ? WHERE id = ?`,
        [item.quantity, item.product_id]
      );
    }

    await connection.query(`DELETE FROM purchases WHERE id = ?`, [id]);

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

//  Update a purchase (with stock adjustment)
export const updatePurchase = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { supplier_name, items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ message: "Purchase items are required." });
    return;
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Fetch old purchase items
    const [oldItems] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM purchase_items WHERE purchase_id = ?`,
      [id]
    );

    // 2. Restore stock for old items
    for (const item of oldItems) {
      await connection.query(
        `UPDATE products SET stock = stock - ? WHERE id = ?`,
        [item.quantity, item.product_id]
      );
    }

    // 3. Delete old purchase items
    await connection.query(`DELETE FROM purchase_items WHERE purchase_id = ?`, [
      id,
    ]);

    // 4. Add new items and adjust stock
    let totalAmount = 0;

    for (const item of items) {
      const { product_id, quantity, purchase_price } = item;

      await connection.query(
        `INSERT INTO purchase_items (purchase_id, product_id, quantity, purchase_price)
         VALUES (?, ?, ?, ?)`,
        [id, product_id, quantity, purchase_price]
      );

      await connection.query(
        `UPDATE products SET stock = stock + ? WHERE id = ?`,
        [quantity, product_id]
      );

      totalAmount += quantity * purchase_price;
    }

    // 5. Update purchases table
    await connection.query(
      `UPDATE purchases SET supplier_name = ?, total_amount = ? WHERE id = ?`,
      [supplier_name, totalAmount, id]
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
