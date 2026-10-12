import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import { config } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import { apiAuthorization } from "./middleware/auth.js";
export function createApp() {
  const app = express();

  const allowedOrigins = config.corsOrigin
    ? config.corsOrigin.split(",").map((x) => x.trim())
    : ["https://agriqora.vercel.app"];

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    })
  );

 
  app.options("*", cors());

  app.use(express.json({ limit: "10mb" }));

  app.use("/api/auth", authRoutes);
  app.use("/api", apiAuthorization, routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

