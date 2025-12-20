import cron from "node-cron";
import { syncEnergyGenerationRecords } from "../application/background/sync-energy-generation-records";
import { generateInvoices } from "../application/background/generate-invoices";
import { detectAnomalies } from "../application/background/anomaly-detection";

export const initializeScheduler = () => {
  // Daily sync (00:00 by default, overridable via SYNC_CRON_SCHEDULE)
  const schedule = process.env.SYNC_CRON_SCHEDULE || "0 0 * * *";
  cron.schedule(schedule, async () => {
    console.log(`[${new Date().toISOString()}] Starting daily energy generation records sync...`);
    try {
      await syncEnergyGenerationRecords();
      console.log(`[${new Date().toISOString()}] Daily sync completed successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Daily sync failed:`, error);
    }
  });

  // Monthly invoice generation (midnight on the 1st)
  cron.schedule("0 0 1 * *", async () => {
    try {
      console.log("Running scheduled invoice generation task");
      await generateInvoices();
    } catch (error) {
      console.error("Error in scheduled invoice generation task:", error);
    }
  });

  console.log(`[Scheduler] Energy generation records sync scheduled for: ${schedule}`);
  // Optional: backfill on startup so dashboards have initial data
  generateInvoices().catch((err) => {
    console.error("Error running startup invoice generation:", err);
  });

  // Anomaly detection every 2 hours (00:00, 02:00, ..., 22:00)
  cron.schedule("0 */2 * * *", async () => {
    try {
      console.log(`[${new Date().toISOString()}] Starting anomaly detection job...`);
      await detectAnomalies();
      console.log(`[${new Date().toISOString()}] Anomaly detection job completed`);
    } catch (error) {
      console.error("Error in anomaly detection job:", error);
    }
  });

  // Run anomaly detection once on startup
  detectAnomalies().catch((err) => {
    console.error("Error running startup anomaly detection:", err);
  });
};
