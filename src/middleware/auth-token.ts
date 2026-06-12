import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { StatusCode, TokenCreateResponseType } from "../types/index.js";
import { errRes, errRouter } from "../errors/error-responder.js";
import { UserDataType } from "../types/auth.js";
import authQueries from "../prisma-utils/auth-queries.js";



class AuthToken {


  public cookieGenerator(id: string): string {
    return jwt.sign({ id }, process.env.JWT_SECRET_KEY!, {
      expiresIn: "72h"
    });
  }

  public cookieConfig(days: number = 3): TokenCreateResponseType {
    const isProduction = process.env.NODE_ENV === "production";
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000 * days, // 72hr
    }
  }


  public async validator(req: Request, _res: Response, next: NextFunction) {

    try {

      const token: string = req.cookies?.token || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.split(" ")[1] : "");

      if (!token) return next(errRes("No Active Session! Please Login!", StatusCode.UNAUTHORIZED));

      // decode token
      const { id } = jwt.verify(token, process.env.JWT_SECRET_KEY!) as JwtPayload;

      // fetch user from DB
      const user: UserDataType | null = await authQueries.findUser({ type: "id", value: id });

      if (!user) {
        return next(errRes("No User found! Please sign in", StatusCode.NOT_FOUND));
      }

      req.user = user;
      req.token = token;

      next();

    } catch (err) {

      return next(errRouter(err));

    }

  }

}

const authToken = new AuthToken();

export default authToken;