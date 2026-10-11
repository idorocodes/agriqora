import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import { config } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import { apiAuthorization } from "./middleware/auth.js";
export function createApp() {
 const app=express();
 app.use(cors({origin:config.corsOrigin.split(",").map(x=>x.trim())}));
 app.use(express.json({limit:"10mb"}));
 app.use("/api/auth", authRoutes);
 app.use("/api", apiAuthorization, routes);
 app.use(notFound); app.use(errorHandler);
 return app;
}
