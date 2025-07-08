import { Request, Response } from "express";
import pool from "../config/db";

// Create Product
export const createProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { name, unit, price, stock } = req.body;

  if (!name || !unit || price == null || stock == null) {
    res.status(400).json({ message: "All fields are required." });
    return;
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO products (name, unit, price, stock, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [name, unit, price, stock]
    );

    res
      .status(201)
      .json({ success: true, productId: (result as any).insertId });
  } catch (error) {
    console.error("Create Product Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// List Products with Pagination
export const listProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  try {
    const [rows] = await pool.query(
      `SELECT * FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countResult] = await pool.query(
      "SELECT COUNT(*) as total FROM products"
    );
    const total = (countResult as any)[0].total;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      currentPage: page,
      totalPages,
      totalProducts: total,
      products: rows,
    });
  } catch (error) {
    console.error("List Products Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get Single Product
export const getProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [
      id,
    ]);

    const product = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    console.error("Get Product Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update Product
export const updateProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { name, unit, price, stock } = req.body;

  try {
    const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [
      id,
    ]);
    if ((rows as any).length === 0) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    await pool.query(
      `UPDATE products SET name = ?, unit = ?, price = ?, stock = ? WHERE id = ?`,
      [name, unit, price, stock, id]
    );

    res
      .status(200)
      .json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    console.error("Update Product Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Delete Product
export const deleteProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [
      id,
    ]);
    if ((rows as any).length === 0) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    await pool.query("DELETE FROM products WHERE id = ?", [id]);

    res
      .status(200)
      .json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
