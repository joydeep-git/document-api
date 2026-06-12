import { Request } from "express";
import { UserDataType } from "./auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: UserDataType;
      token?: string;
    }
  }
}
