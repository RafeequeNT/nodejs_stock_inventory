import cors, { CorsOptionsDelegate } from "cors";
import { Request } from "express";

const whitelist = ["http://localhost:3000", "https://localhost:3443"];

const corsOptionsDelegate: CorsOptionsDelegate<Request> = (req, callback) => {
  const origin = req.header("Origin");
  const corsOptions = {
    origin: origin && whitelist.includes(origin),
    credentials: true,
  };
  callback(null, corsOptions);
};

export const corsWithOptions = cors(corsOptionsDelegate);
export const corsDefault = cors(); // if you need default

export default corsWithOptions;
