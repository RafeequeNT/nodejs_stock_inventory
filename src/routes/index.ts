// src/routes/index.ts (or wherever the router is)
import { Router, Request, Response } from "express";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.send("<h1>Welcome to Express with Typescript</h1>");
});

export default router;
