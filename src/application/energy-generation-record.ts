import { GetAllEnergyGenerationRecordsQueryDto } from "../domain/dtos/solar-unit";
import { ValidationError } from "../domain/errors/errors";
import { EnergyGenerationRecord } from "../infrastructure/entities/EnergyGenerationRecord";
import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";

export const getAllEnergyGenerationRecordsBySolarUnitId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const solarUnitObjectId = new Types.ObjectId(id);

    const parsed = GetAllEnergyGenerationRecordsQueryDto.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError("Invalid query parameters");
    }
    const { groupBy, limit } = parsed.data;

    // No grouping: return raw records
    if (!groupBy) {
      const energyGenerationRecords = await EnergyGenerationRecord.find({
        solarUnitId: solarUnitObjectId,
      }).sort({ timestamp: -1 });
      return res.status(200).json(energyGenerationRecords);
    }

    // Group by date
    if (groupBy === "date") {
      const pipeline: any[] = [
        { $match: { solarUnitId: solarUnitObjectId } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            },
            totalEnergy: { $sum: "$energyGenerated" },
          },
        },
        { $sort: { "_id.date": -1 } },
      ];
      if (limit) pipeline.push({ $limit: parseInt(limit, 10) });
      const energyGenerationRecords = await EnergyGenerationRecord.aggregate(pipeline);
      return res.status(200).json(energyGenerationRecords);
    }

    // Group by hour (last 24h)
    if (groupBy === "hour") {
      const hoursLimit = limit ? parseInt(limit, 10) : 24;
      const now = new Date();
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const energyGenerationRecords = await EnergyGenerationRecord.aggregate([
        {
          $match: {
            solarUnitId: solarUnitObjectId,
            timestamp: { $gte: since, $lte: now },
          },
        },
        {
          $group: {
            _id: { hour: { $hour: "$timestamp" } },
            totalEnergy: { $sum: "$energyGenerated" },
          },
        },
        { $sort: { "_id.hour": 1 } },
        { $limit: hoursLimit },
      ]);
      return res.status(200).json(energyGenerationRecords);
    }

    throw new ValidationError("Invalid groupBy parameter. Must be 'date' or 'hour'.");
  } catch (error) {
    next(error);
  }
};
