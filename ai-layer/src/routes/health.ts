import { Router, type IRouter } from "express";
import { getDbInfo } from "../lib/db.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok", db: getDbInfo() });
});

export default router;
