import { Router } from "express";
import produceRoutes from "./produce.routes.js";
import traceabilityRoutes from "./traceability.routes.js";
import requestsRoutes from "./requests.routes.js";
import usersRoutes from "./users.routes.js";
import recordsRoutes from "./records.routes.js";
import communityRoutes from "./community.routes.js";
import platformRoutes from "./platform.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, status: "ok", uptime: process.uptime() });
});

router.use("/produce", produceRoutes);
router.use("/traceability", traceabilityRoutes);
router.use("/requests", requestsRoutes);
router.use("/users", usersRoutes);
router.use("/records", recordsRoutes);
router.use("/community", communityRoutes);
router.use("/", platformRoutes); // /learn, /notifications, /admin/stats

export default router;
