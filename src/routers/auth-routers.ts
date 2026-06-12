import { Router } from "express";
import authControllers from "../controllers/auth-controllers.js";
import authToken from "../middleware/auth-token.js";

const authRouters = Router();

// Public
authRouters.post("/register", authControllers.register);
authRouters.post("/login", authControllers.login);

// auth required
authRouters.post("/logout", authToken.validator, authControllers.logout);
authRouters.get("/me", authToken.validator, authControllers.me);

export default authRouters;