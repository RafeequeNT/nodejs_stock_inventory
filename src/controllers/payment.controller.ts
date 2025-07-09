import { Request, Response } from "express";
import pool from "../config/db";
import { RowDataPacket } from "mysql2";

// Add a payment to a sale
export const addPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { sale_id, amount, payment_type } = req.body;

  if (!sale_id || !amount || amount <= 0 || !payment_type) {
    res
      .status(400)
      .json({ message: "Invalid sale_id, amount, or payment_type" });
    return;
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Check if sale exists
    const [sales] = await connection.query<RowDataPacket[]>(
      "SELECT total_amount FROM sales WHERE id = ?",
      [sale_id]
    );

    if (sales.length === 0) {
      await connection.rollback();
      connection.release();
      res.status(404).json({ message: "Sale not found" });
      return;
    }

    const totalAmount = sales[0].total_amount;

    // Get total paid so far
    const [payments] = await connection.query<RowDataPacket[]>(
      "SELECT IFNULL(SUM(amount), 0) as paid FROM sale_payments WHERE sale_id = ?",
      [sale_id]
    );

    const totalPaidBefore = payments[0].paid;
    const remainingBalance = totalAmount - totalPaidBefore;

    if (amount > remainingBalance) {
      await connection.rollback();
      connection.release();
      res.status(400).json({
        message: `Payment exceeds remaining balance. Remaining: ₹${remainingBalance}`,
      });
      return;
    }

    const totalPaidAfter = totalPaidBefore + amount;

    // Determine new payment status
    let newStatus: "paid" | "partial" | "credit" = "credit";
    if (totalPaidAfter >= totalAmount) {
      newStatus = "paid";
    } else if (totalPaidAfter > 0) {
      newStatus = "partial";
    }

    // Insert payment
    await connection.query(
      "INSERT INTO sale_payments (sale_id, amount, payment_type, paid_at) VALUES (?, ?, ?, NOW())",
      [sale_id, amount, payment_type]
    );

    // Update payment status
    await connection.query("UPDATE sales SET payment_status = ? WHERE id = ?", [
      newStatus,
      sale_id,
    ]);

    await connection.commit();
    connection.release();

    res.status(200).json({
      success: true,
      message: "Payment added successfully",
      new_payment_status: newStatus,
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Add Payment Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
// List all payments of a sale
export const listPaymentsForSale = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { sale_id } = req.params;

  try {
    const [payments] = await pool.query(
      `SELECT id, amount, payment_type, paid_at FROM sale_payments WHERE sale_id = ? ORDER BY paid_at`,
      [sale_id]
    );

    res.status(200).json({ success: true, payments });
  } catch (error) {
    console.error("List Payments Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Delete a payment
export const deletePayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { payment_id } = req.params;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Fetch payment details
    const [payments] = await connection.query<RowDataPacket[]>(
      "SELECT sale_id, amount FROM sale_payments WHERE id = ?",
      [payment_id]
    );

    if (payments.length === 0) {
      await connection.rollback();
      connection.release();
      res.status(404).json({ message: "Payment not found" });
      return;
    }

    const { sale_id, amount } = payments[0];

    // Delete the payment
    await connection.query("DELETE FROM sale_payments WHERE id = ?", [
      payment_id,
    ]);

    // Recalculate total paid
    const [sales] = await connection.query<RowDataPacket[]>(
      "SELECT total_amount FROM sales WHERE id = ?",
      [sale_id]
    );

    const totalAmount = sales[0].total_amount;

    const [paymentsAfter] = await connection.query<RowDataPacket[]>(
      "SELECT IFNULL(SUM(amount), 0) AS paid FROM sale_payments WHERE sale_id = ?",
      [sale_id]
    );

    const totalPaid = paymentsAfter[0].paid;

    // Update new status
    let newStatus: "paid" | "partial" | "credit" = "credit";
    if (totalPaid >= totalAmount) {
      newStatus = "paid";
    } else if (totalPaid > 0) {
      newStatus = "partial";
    }

    await connection.query("UPDATE sales SET payment_status = ? WHERE id = ?", [
      newStatus,
      sale_id,
    ]);

    await connection.commit();
    connection.release();

    res.status(200).json({
      success: true,
      message: "Payment deleted successfully",
      new_payment_status: newStatus,
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Delete Payment Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
