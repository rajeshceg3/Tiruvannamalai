import { db } from "./db";
import { movementLogs } from "@shared/schema";
import { lt } from "drizzle-orm";
import { log } from "./lib/logger";

// Prune items older than 30 days
const PRUNE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
// Run every 24 hours
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function startCronJobs() {
  log("Initializing cron jobs...");

  // Run immediately on startup to clean up
  runPrune();

  setInterval(runPrune, PRUNE_INTERVAL_MS);
}

async function runPrune() {
  try {
    const cutoff = new Date(Date.now() - PRUNE_AGE_MS);
    const result = await db.delete(movementLogs).where(lt(movementLogs.timestamp, cutoff));
    if (result.rowCount && result.rowCount > 0) {
        log(`[CRON] Pruned ${result.rowCount} old movement logs.`);
    }
  } catch (error) {
    console.error("[CRON] Pruning failed:", error);
  }
}
