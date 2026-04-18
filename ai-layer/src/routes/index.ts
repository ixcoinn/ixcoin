// ============================================================
// ROUTES/INDEX.TS — Central Router
// FIX: Removed double /api prefix on walletRouter
// ============================================================

import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import { instancesRouter, monitorRouter, poolRouter } from "./ai/index.js";
import civilizationLiveRouter from "./civilization-live.js";
import { walletRouter } from "./wallet.js";
import p2pRouter from "./p2p/index.js";
import validatorRouter from "./validator.js";
import reputationRouter from "./reputation.js";
import contributionRouter from "./contribution.js";
import engineRouter from "./engine.js";
import securityRouter from "./security.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(instancesRouter);
router.use(monitorRouter);
router.use(poolRouter);
router.use(civilizationLiveRouter);
router.use("/wallet", walletRouter);  // FIX: was /api/wallet — double prefix (app.ts already mounts at /api)
router.use(p2pRouter);
router.use(validatorRouter);
router.use(reputationRouter);
router.use(contributionRouter);
router.use(engineRouter);
router.use(securityRouter);

export default router;
