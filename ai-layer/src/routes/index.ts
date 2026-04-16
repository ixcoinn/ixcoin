import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import { instancesRouter, monitorRouter, poolRouter } from "./ai/index.js";
import civilizationLiveRouter from "./civilization-live.js";
import { walletRouter } from "./wallet.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(instancesRouter);
router.use(monitorRouter);
router.use(poolRouter);
router.use(civilizationLiveRouter);
router.use("/api/wallet", walletRouter);

export default router;
