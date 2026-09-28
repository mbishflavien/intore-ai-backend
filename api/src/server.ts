import "dotenv/config";
import { startServer } from "./app.js";

// Thin bootstrap — all routing/middleware lives in app.ts + routes/*.
// Legacy node:http implementation preserved at server.legacy.ts for reference.
startServer().catch((error) => {
  console.error("Failed to start server:", error instanceof Error ? error.message : error);
  process.exit(1);
});
