import { SolarUnit } from "../../infrastructure/entities/SolarUnit";
import cron from "node-cron";
import { Invoice } from "../../infrastructure/entities/Invoice";
import { EnergyGenerationRecord } from "../../infrastructure/entities/EnergyGenerationRecord";
import mongoose from "mongoose";

/**
 * Generate invoices for all active solar units for each month since installation
 * up to the last completed month. Skips months that already have an invoice.
 */
export const generateInvoices = async (referenceDate?: Date) => {
  try {
    const dateToUse = referenceDate || new Date();
    const endOfLastMonth = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), 0, 23, 59, 59, 999);

    const solarUnits = await SolarUnit.find({ status: "ACTIVE" }).exec();

    for (const solarUnit of solarUnits) {
      const installationDate = solarUnit.installationDate ? new Date(solarUnit.installationDate) : null;
      if (!installationDate || installationDate > endOfLastMonth) {
        continue;
      }

      // Start from the first day of the installation month
      let periodStart = new Date(installationDate.getFullYear(), installationDate.getMonth(), 1);

      while (periodStart <= endOfLastMonth) {
        const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0, 23, 59, 59, 999);
        if (periodEnd > endOfLastMonth) {
          break; // only generate completed months
        }

        const existingInvoice = await Invoice.findOne({
          solarUnitId: solarUnit._id,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
        }).exec();
        if (existingInvoice) {
          periodStart = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 1);
          continue;
        }

        const energyRecords = await EnergyGenerationRecord.aggregate([
          {
            $match: {
              solarUnitId: new mongoose.Types.ObjectId(solarUnit._id),
              timestamp: {
                $gte: periodStart,
                $lte: periodEnd,
              },
            },
          },
          {
            $group: {
              _id: null,
              totalEnergyGenerated: { $sum: "$energyGenerated" },
            },
          },
        ]);

         console.log("Energy records for invoice generation:", energyRecords);
        const totalEnergyGenerated = energyRecords.length > 0 ? energyRecords[0].totalEnergyGenerated : 0;

        // Ensure a valid userId exists before creating the invoice
        if (!solarUnit.userId) {
          console.warn(`Skipping invoice for Solar Unit ${solarUnit._id} due to missing userId`);
          periodStart = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 1);
          continue;
        }

        await Invoice.create({
          solarUnitId: new mongoose.Types.ObjectId(solarUnit._id),
          userId: new mongoose.Types.ObjectId(solarUnit.userId),
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          totalEnergyGenerated,
          paymentStatus: "PENDING",
        } as any);

        console.log(
          `Generated invoice for Solar Unit ${solarUnit._id} for period ${periodStart.toISOString()} - ${periodEnd.toISOString()}`
        );

        periodStart = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 1);
      }
    }
  } catch (error) {
    console.error("Error generating invoices:", error);
  }
};
