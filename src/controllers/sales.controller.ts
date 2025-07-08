import { Request, Response } from "express";
import pool from "../config/db";
import { RowDataPacket } from "mysql2";

// Create Sale (with transaction)
export const createSale = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { product_id, quantity, selling_price } = req.body;

  if (!product_id || !quantity || !selling_price) {
    res.status(400).json({ message: "All fields are required." });
    return;
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [result] = await connection.query(
      `INSERT INTO sales (product_id, quantity, selling_price, sale_date)
       VALUES (?, ?, ?, NOW())`,
      [product_id, quantity, selling_price]
    );

    await connection.query(
      `UPDATE products SET stock = stock - ? WHERE id = ?`,
      [quantity, product_id]
    );

    await connection.commit();
    connection.release();

    res.status(201).json({ success: true, saleId: (result as any).insertId });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Create Sale Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// List All Sales (with product info)
export const listSales = async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.product_id, p.name AS product_name, p.unit,
              s.quantity, s.selling_price, s.sale_date
       FROM sales s
       JOIN products p ON s.product_id = p.id
       ORDER BY s.sale_date DESC`
    );

    res.status(200).json({ success: true, sales: rows });
  } catch (error) {
    console.error("List Sales Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get Sale by ID
export const getSale = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.product_id, p.name AS product_name, p.unit,
              s.quantity, s.selling_price, s.sale_date
       FROM sales s
       JOIN products p ON s.product_id = p.id
       WHERE s.id = ?`,
      [id]
    );

    const sale = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!sale) {
      res.status(404).json({ message: "Sale not found" });
      return;
    }

    res.status(200).json({ success: true, sale });
  } catch (error) {
    console.error("Get Sale Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update Sale (with transaction)
export const updateSale = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { product_id, quantity, selling_price } = req.body;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT * FROM sales WHERE id = ?",
      [id]
    );
    const originalSale = rows[0];

    if (!originalSale) {
      connection.release();
      res.status(404).json({ message: "Sale not found" });
      return;
    }

    const originalQty = originalSale.quantity;
    const oldProductId = originalSale.product_id;

    // Undo old sale (restore stock)
    await connection.query(
      `UPDATE products SET stock = stock + ? WHERE id = ?`,
      [originalQty, oldProductId]
    );

    // Deduct new quantity
    await connection.query(
      `UPDATE products SET stock = stock - ? WHERE id = ?`,
      [quantity, product_id]
    );

    // Update sale record
    await connection.query(
      `UPDATE sales
         SET product_id = ?, quantity = ?, selling_price = ?
         WHERE id = ?`,
      [product_id, quantity, selling_price, id]
    );

    await connection.commit();
    connection.release();

    res
      .status(200)
      .json({ success: true, message: "Sale updated successfully" });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Update Sale Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Delete Sale (with transaction)
export const deleteSale = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT * FROM sales WHERE id = ?",
      [id]
    );

    const sale = rows[0];

    if (!sale) {
      connection.release();
      res.status(404).json({ message: "Sale not found" });
      return;
    }

    const { product_id, quantity } = sale;

    // Restore sold quantity
    await connection.query(
      `UPDATE products SET stock = stock + ? WHERE id = ?`,
      [quantity, product_id]
    );

    // Delete sale record
    await connection.query("DELETE FROM sales WHERE id = ?", [id]);

    await connection.commit();
    connection.release();

    res
      .status(200)
      .json({ success: true, message: "Sale deleted successfully" });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Delete Sale Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
