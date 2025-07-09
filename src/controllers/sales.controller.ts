import { Request, Response } from "express";
import pool from "../config/db";
import { RowDataPacket } from "mysql2";

// Create Sale (with multiple items, transaction)
export const createSale = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { customer_name, customer_phone, items } = req.body;

  if (!customer_name || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ message: "Missing fields or empty items" });
    return;
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const total_amount = items.reduce(
      (sum, item) => sum + item.quantity * item.selling_price,
      0
    );

    const [saleResult] = await connection.query(
      `INSERT INTO sales (customer_name, customer_phone, total_amount, created_at)
       VALUES (?, ?, ?, NOW())`,
      [customer_name, customer_phone || null, total_amount]
    );

    const saleId = (saleResult as any).insertId;

    for (const item of items) {
      const { product_id, quantity, selling_price } = item;

      await connection.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, selling_price)
         VALUES (?, ?, ?, ?)`,
        [saleId, product_id, quantity, selling_price]
      );

      await connection.query(
        `UPDATE products SET stock = stock - ? WHERE id = ?`,
        [quantity, product_id]
      );
    }

    await connection.commit();
    connection.release();

    res.status(201).json({ success: true, sale_id: saleId });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Create Sale Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// List Sales with items and customer info
export const listSales = async (req: Request, res: Response): Promise<void> => {
  try {
    const [sales] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM sales ORDER BY created_at DESC`
    );

    for (const sale of sales) {
      const [items] = await pool.query<RowDataPacket[]>(
        `SELECT si.product_id, p.name AS product_name, si.quantity, si.selling_price
         FROM sale_items si
         JOIN products p ON si.product_id = p.id
         WHERE si.sale_id = ?`,
        [sale.id]
      );
      sale.items = items;

      const [payments] = await pool.query<RowDataPacket[]>(
        `SELECT SUM(amount) as total_paid FROM sale_payments WHERE sale_id = ?`,
        [sale.id]
      );

      const totalPaid = payments[0].total_paid || 0;
      sale.payment_status =
        totalPaid === sale.total_amount
          ? "paid"
          : totalPaid > 0
          ? "partial"
          : "credit";
    }

    res.status(200).json({ success: true, sales });
  } catch (error) {
    console.error("List Sales Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get a single sale
export const getSale = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const [sales] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM sales WHERE id = ?`,
      [id]
    );

    const sale = sales[0];

    if (!sale) {
      res.status(404).json({ message: "Sale not found" });
      return;
    }

    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT si.product_id, p.name AS product_name, si.quantity, si.selling_price
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = ?`,
      [id]
    );

    sale.items = items;

    const [payments] = await pool.query<RowDataPacket[]>(
      `SELECT SUM(amount) as total_paid FROM sale_payments WHERE sale_id = ?`,
      [id]
    );

    const totalPaid = payments[0].total_paid || 0;
    sale.payment_status =
      totalPaid === sale.total_amount
        ? "paid"
        : totalPaid > 0
        ? "partial"
        : "credit";

    res.status(200).json({ success: true, sale });
  } catch (error) {
    console.error("Get Sale Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update sale (with stock adjustment and payment_status refresh)
export const updateSale = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { customer_name, customer_phone, items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ message: "Sale items are required." });
    return;
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Restore old stock
    const [existingItems] = await connection.query<RowDataPacket[]>(
      "SELECT * FROM sale_items WHERE sale_id = ?",
      [id]
    );

    for (const item of existingItems) {
      await connection.query(
        `UPDATE products SET stock = stock + ? WHERE id = ?`,
        [item.quantity, item.product_id]
      );
    }

    // 2. Delete existing sale items
    await connection.query("DELETE FROM sale_items WHERE sale_id = ?", [id]);

    // 3. Insert new sale items and reduce stock
    let total_amount = 0;

    for (const item of items) {
      const { product_id, quantity, selling_price } = item;
      total_amount += quantity * selling_price;

      await connection.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, selling_price)
         VALUES (?, ?, ?, ?)`,
        [id, product_id, quantity, selling_price]
      );

      await connection.query(
        `UPDATE products SET stock = stock - ? WHERE id = ?`,
        [quantity, product_id]
      );
    }

    // 4. Calculate total paid
    const [paymentResult] = await connection.query<RowDataPacket[]>(
      `SELECT SUM(amount_paid) as total_paid FROM sale_payments WHERE sale_id = ?`,
      [id]
    );

    const paid = paymentResult[0].total_paid || 0;
    let status: "paid" | "partial" | "credit" = "credit";

    if (paid === total_amount) {
      status = "paid";
    } else if (paid > 0 && paid < total_amount) {
      status = "partial";
    }

    // 5. Update sale record
    await connection.query(
      `UPDATE sales
       SET customer_name = ?, customer_phone = ?, total_amount = ?, payment_status = ?
       WHERE id = ?`,
      [customer_name, customer_phone, total_amount, status, id]
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

// Delete Sale (including sale_items and restoring stock)
export const deleteSale = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Get sale items
    const [items] = await connection.query<RowDataPacket[]>(
      `SELECT product_id, quantity FROM sale_items WHERE sale_id = ?`,
      [id]
    );

    if (!items || items.length === 0) {
      await connection.rollback();
      connection.release();
      res.status(404).json({ message: "Sale not found or has no items" });
      return;
    }

    // 2. Restore stock
    for (const item of items) {
      await connection.query(
        `UPDATE products SET stock = stock + ? WHERE id = ?`,
        [item.quantity, item.product_id]
      );
    }

    // 3. Delete sale items
    await connection.query("DELETE FROM sale_items WHERE sale_id = ?", [id]);

    // 4. Delete payments
    await connection.query("DELETE FROM sale_payments WHERE sale_id = ?", [id]);

    // 5. Delete sale record
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

export const getCreditSalesWithBalance = async (
  req: Request,
  res: Response
): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  try {
    // Get total count of credit/partial sales
    const [countResult] = await pool.query(
      `SELECT COUNT(DISTINCT s.id) AS total
       FROM sales s
       WHERE s.payment_status IN ('credit', 'partial')`
    );
    const total = (countResult as any)[0].total;

    // Main query with pagination
    const [rows] = await pool.query(
      `
      SELECT 
        s.id AS sale_id,
        s.customer_name,
        s.customer_phone,
        s.total_amount,
        s.payment_status,
        s.created_at,
        IFNULL(SUM(sp.amount), 0) AS total_paid,
        (s.total_amount - IFNULL(SUM(sp.amount), 0)) AS remaining_balance
      FROM sales s
      LEFT JOIN sale_payments sp ON s.id = sp.sale_id
      WHERE s.payment_status IN ('credit', 'partial')
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [limit, offset]
    );

    res.status(200).json({
      success: true,
      current_page: page,
      total_pages: Math.ceil(total / limit),
      total_records: total,
      records: rows,
    });
  } catch (error) {
    console.error("Get Credit Sales Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
