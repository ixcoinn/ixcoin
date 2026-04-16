import app from "./app.js";
import { logger } from "./lib/logger.js";
import { startMonitor, stopMonitor } from "./activity/transaction_monitor.js";
import { getCivilizationState } from "./ai-layer/state.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = parseInt(rawPort, 10);

if (isNaN(port)) {
  throw new Error("PORT must be a valid number: " + rawPort);
}

const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "AI Layer server started");
  startMonitor();
  getCivilizationState();
  logger.info("Autonomous Digital Civilization is ALIVE!");
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received — shutting down");
  stopMonitor();
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  logger.info("SIGINT received — shutting down");
  stopMonitor();
  server.close(() => process.exit(0));
});