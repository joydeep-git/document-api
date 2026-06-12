import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import cors from "cors";

import errorMiddleware from "./errors/error-middleware.js";
import routeErrorHandler from "./middleware/route-error-handler.js";
import { responseWrapper } from "./middleware/response-wrapper.js";

import authRouters from "./routers/auth-routers.js";
import documentRouters from "./routers/document-routers.js";

import { config as dotenvConfig } from "dotenv";


class Server {

  private readonly app: Application = express();

  private readonly port: number = Number(process.env.PORT || 5000);

  constructor() {

    dotenvConfig();

    this.runServer();

    this.startServer();

  }


  // running all
  private async runServer() {

    try {

      this.securityConfig();

      this.middlewareConfig();

      this.createRoutes();

      this.errorMiddlewareConfig();


    } catch (err) {

      console.log("Server Init Failed:", err);

      process.exit(1);

    }

  }


  // cors, rate limit, and header security
  private securityConfig() {

    this.app.use(helmet());

    // trust reverse proxy
    this.app.set("trust proxy", 1);

    this.app.use(
      cors({
        origin: [process.env.LOCAL_FRONTEND_URL!, process.env.FRONTEND_URL!],
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        credentials: true,
        optionsSuccessStatus: 204,
      })
    );

    // 300 req / 15 min
    this.app.use(rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: "Too many requests. Max 300 per 15 minutes." },
    }));

    // Tighter limit for auth endpoints
    this.app.use("/api/auth", rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: "Too many auth requests. Please wait." },
    }));

  }


  // request body parser + cookies
  private middlewareConfig() {
    this.app.use(express.json({ limit: "5mb" }));
    this.app.use(cookieParser());
  }


  // project routes
  private createRoutes() {

    // Wrap all success responses with { success: true, error: false }
    this.app.use(responseWrapper);

    // Health check
    this.app.get("/api/health", (_req: Request, res: Response) => {
      res.status(200).json({ status: "ok", service: "document-api" });
    });

    this.app.use("/api/auth", authRouters);
    this.app.use("/api/documents", documentRouters);

  }


  // error middlewares
  private errorMiddlewareConfig() {

    this.app.use(routeErrorHandler);

    this.app.use(errorMiddleware);

  }


  // start server
  private startServer() {

    this.app.listen(this.port, () => {
      console.log(`Document API running on port ${this.port}`);
      console.log(`Health: http://localhost:${this.port}/api/health\n`);
    });

  }

}

new Server();
