import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { Anomaly } from "../infrastructure/entities/Anomaly";
import { SolarUnit } from "../infrastructure/entities/SolarUnit";
import { User } from "../infrastructure/entities/User";
import { detectAnomalies } from "./background/anomaly-detection";
import { z } from "zod";

// Build a filter object from query params
const buildFilters = (req: Request) => {
  const filters: any = {};
  if (req.query.type) filters.anomalyType = req.query.type;
  if (req.query.severity) filters.severity = req.query.severity;
  if (req.query.resolved !== undefined) {
    // Accept resolved=true|false
    filters.resolvedStatus = String(req.query.resolved).toLowerCase() === "true";
  }
  return filters;
};

let anomaliesPrimed = false;
const ensureAnomaliesPrimed = async () => {
  if (anomaliesPrimed) return;
  try {
    await detectAnomalies();
  } catch (err) {
    console.error("Error priming anomalies:", err);
  } finally {
    anomaliesPrimed = true;
  }
};

const trendsQuerySchema = z.object({
  groupBy: z.enum(["daily", "weekly", "monthly"]).default("daily"),
  limit: z.string().optional(),
});

const buildTrendsPipeline = (filters: any, groupBy: "daily" | "weekly" | "monthly", limit?: number) => {
  const pipeline: any[] = [{ $match: filters }];

  if (groupBy === "daily") {
    pipeline.push({
      $group: {
        _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$detectionTimestamp" } } },
        count: { $sum: 1 },
      },
    });
    pipeline.push({ $sort: { "_id.date": 1 } });
  } else if (groupBy === "weekly") {
    pipeline.push({
      $group: {
        _id: {
          week: { $dateToString: { format: "%G-%V", date: "$detectionTimestamp" } },
        },
        count: { $sum: 1 },
      },
    });
    pipeline.push({ $sort: { "_id.week": 1 } });
  } else {
    pipeline.push({
      $group: {
        _id: { month: { $dateToString: { format: "%Y-%m", date: "$detectionTimestamp" } } },
        count: { $sum: 1 },
      },
    });
    pipeline.push({ $sort: { "_id.month": 1 } });
  }

  if (limit && Number.isFinite(limit)) {
    pipeline.push({ $limit: limit });
  }
  return pipeline;
};

// User: only anomalies for their solar units
export const getMyAnomalies = async (req: Request, res: Response) => {
  await ensureAnomaliesPrimed();
  const auth = getAuth(req);
  if (!auth?.userId) return res.status(401).json({ message: "Unauthorized" });

  const user = await User.findOne({ clerkUserId: auth.userId }).lean();
  if (!user) return res.status(404).json({ message: "User not found" });

  const units = await SolarUnit.find({ userId: user._id }).select("_id").lean();
  const unitIds = units.map((u) => u._id);

  const filters = buildFilters(req);
  filters.solarUnitId = { $in: unitIds };

  const anomalies = await Anomaly.find(filters).sort({ detectionTimestamp: -1 }).lean();
  res.json(anomalies);
};

// Admin: all anomalies, optional filters and optional solarUnitId query
export const getAllAnomalies = async (req: Request, res: Response) => {
  await ensureAnomaliesPrimed();
  const filters = buildFilters(req);
  if (req.query.solarUnitId) {
    filters.solarUnitId = req.query.solarUnitId;
  }
  const anomalies = await Anomaly.find(filters).sort({ detectionTimestamp: -1 }).lean();
  res.json(anomalies);
};

// Trends: user scope
export const getMyAnomalyTrends = async (req: Request, res: Response) => {
  await ensureAnomaliesPrimed();
  const parsed = trendsQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: "Invalid query" });

  const { groupBy, limit } = parsed.data;
  const limitNum = limit ? parseInt(limit, 10) : groupBy === "monthly" ? 12 : groupBy === "weekly" ? 26 : 30;

  const auth = getAuth(req);
  if (!auth?.userId) return res.status(401).json({ message: "Unauthorized" });

  const user = await User.findOne({ clerkUserId: auth.userId }).lean();
  if (!user) return res.status(404).json({ message: "User not found" });

  const units = await SolarUnit.find({ userId: user._id }).select("_id").lean();
  const unitIds = units.map((u) => u._id);

  const filters = { ...buildFilters(req), solarUnitId: { $in: unitIds } };
  const pipeline = buildTrendsPipeline(filters, groupBy, limitNum);
  const data = await Anomaly.aggregate(pipeline);
  res.json(data);
};

// Trends: admin scope (all anomalies)
export const getAllAnomalyTrends = async (req: Request, res: Response) => {
  await ensureAnomaliesPrimed();
  const parsed = trendsQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: "Invalid query" });

  const { groupBy, limit } = parsed.data;
  const limitNum = limit ? parseInt(limit, 10) : groupBy === "monthly" ? 12 : groupBy === "weekly" ? 26 : 30;

  const filters = buildFilters(req);
  if (req.query.solarUnitId) {
    filters.solarUnitId = req.query.solarUnitId;
  }
  const pipeline = buildTrendsPipeline(filters, groupBy, limitNum);
  const data = await Anomaly.aggregate(pipeline);
  res.json(data);
};
