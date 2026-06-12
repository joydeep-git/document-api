import { NextFunction, Request, Response } from "express";
import { StatusCode } from "../types/index.js";
import { errRes, errRouter } from "../errors/error-responder.js";
import authQueries from "../prisma-utils/auth-queries.js";
import authToken from "../middleware/auth-token.js";



const authControllers = {


  async register(req: Request, res: Response, next: NextFunction) {
    try {

      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return next(errRes("name, email, and password are required", StatusCode.BAD_REQUEST));
      }

      if (password.length < 8) {
        return next(errRes("Password must be at least 8 characters", StatusCode.BAD_REQUEST));
      }

      const existing = await authQueries.findUser({ type: "email", value: email });

      if (existing) {
        return next(errRes("An account with this email already exists", StatusCode.CONFLICT));
      }

      const user = await authQueries.createUser({ name, email, password });

      const token = authToken.cookieGenerator(user.id);

      res.cookie("token", token, authToken.cookieConfig(3));

      return res.status(StatusCode.CREATED).json({
        message: "Account created successfully",
        user,
      });

    } catch (err) {
      return next(errRouter(err));
    }
  },


  async login(req: Request, res: Response, next: NextFunction) {
    try {

      const { email, password } = req.body;

      if (!email || !password) {
        return next(errRes("email and password are required", StatusCode.BAD_REQUEST));
      }

      const user = await authQueries.verifyPassword({ email, plainPassword: password });

      if (!user) {
        return next(errRes("Invalid email or password", StatusCode.UNAUTHORIZED));
      }

      const token = authToken.cookieGenerator(user.id);

      res.cookie("token", token, authToken.cookieConfig(3));

      return res.status(StatusCode.OK).json({
        message: "Login successful",
        user,
      });

    } catch (err) {
      return next(errRouter(err));
    }
  },


  async logout(_req: Request, res: Response, next: NextFunction) {
    try {

      res.clearCookie("token");

      return res.status(StatusCode.OK).json({ message: "Logged out successfully" });

    } catch (err) {
      return next(errRouter(err));
    }
  },


  async me(req: Request, res: Response, next: NextFunction) {
    try {

      return res.status(StatusCode.OK).json({ user: req.user });

    } catch (err) {
      return next(errRouter(err));
    }
  },

};


export default authControllers;
