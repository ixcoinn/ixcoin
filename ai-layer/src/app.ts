// ============================================================
// APP.TS — Express Application
// SECURITY FIX: Added security headers, sanitizeBody, safeErrorHandler
// SECURITY FIX: CORS now restricted to allowed origins
// ============================================================

import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { securityHeaders, sanitizeBody, safeErrorHandler } from "./middlewares/security.js";

const app: Express = express();

// ── SECURITY HEADERS (must be first) ─────────────────────────
app.use(securityHeaders);

// ── CORS: restrict to known origins in production ────────────
const allowedOrigins = (process.env["ALLOWED_ORIGINS"] ?? "*").split(",").map(s => s.trim());
app.use(cors({
  origin: allowedOrigins.includes("*") ? "*" : (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error("Not allowed by CORS"));
  },
  methods:      ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
}));

// ── LOGGING ───────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
      res(res) { return { statusCode: res.statusCode }; },
    },
  }),
);

// ── BODY PARSING ──────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));           // FIX: Limit request body size
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── SANITIZE BODY ─────────────────────────────────────────────
app.use(sanitizeBody);

// ── ROUTES ───────────────────────────────────────────────────
app.use("/api", router);

// ── GLOBAL ERROR HANDLER (must be last) ───────────────────────
app.use(safeErrorHandler);

export default app;
