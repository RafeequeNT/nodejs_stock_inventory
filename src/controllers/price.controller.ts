import { Request, Response } from "express";
import { RowDataPacket } from "mysql2";

import pool from "../config/db";

export const addPrice = async (req: Request, res: Response): Promise<void> => {
  const { product_id, price, effective_from } = req.body;

  if (!product_id || !price) {
    res.status(400).json({ message: "product_id and price are required" });
    return;
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Insert into price history
    const [result] = await connection.query(
      `INSERT INTO product_prices (product_id, price, effective_from)
       VALUES (?, ?, ?)`,
      [product_id, price, effective_from || new Date()]
    );

    // 2. Update product's current price
    await connection.query(`UPDATE products SET price = ? WHERE id = ?`, [
      price,
      product_id,
    ]);

    // 3. Commit transaction
    await connection.commit();
    connection.release();

    res.status(201).json({
      success: true,
      priceHistoryId: (result as any).insertId,
      message: "Price added and product updated successfully",
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Transaction Error (Price Add):", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const listPrices = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { product_id } = req.params;
  const { from, to, page = "1", limit = "10" } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 10;
  const offset = (pageNum - 1) * limitNum;

  let query = `SELECT * FROM product_prices WHERE product_id = ?`;
  let countQuery = `SELECT COUNT(*) as total FROM product_prices WHERE product_id = ?`;
  const params: any[] = [product_id];
  const countParams: any[] = [product_id];

  // Apply date filters
  if (from) {
    query += ` AND effective_from >= ?`;
    countQuery += ` AND effective_from >= ?`;
    const fromDate = new Date(from as string);
    params.push(fromDate);
    countParams.push(fromDate);
  }

  if (to) {
    query += ` AND effective_from <= ?`;
    countQuery += ` AND effective_from <= ?`;
    const toDate = new Date(to as string);
    params.push(toDate);
    countParams.push(toDate);
  }

  query += ` ORDER BY effective_from DESC LIMIT ? OFFSET ?`;
  params.push(limitNum, offset);

  try {
    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    const [countResult] = await pool.query<RowDataPacket[]>(
      countQuery,
      countParams
    );

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      prices: rows,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalRecords: total,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("List Prices Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
