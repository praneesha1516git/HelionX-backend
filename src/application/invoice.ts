import { getAuth } from "@clerk/express";
import { ValidationError } from "../domain/errors/errors";
import { Invoice } from "../infrastructure/entities/Invoice";
import { NextFunction, Request , Response } from "express";
import { User } from "../infrastructure/entities/User";
import { Types } from "mongoose";
import { EnergyGenerationRecord } from "../infrastructure/entities/EnergyGenerationRecord";
import { generateInvoices } from "./background/generate-invoices";

const PRICE_PER_KWH = parseFloat(process.env.PRICE_PER_KWH || "0.2");

const hydrateEnergyTotals = async (invoices: any[]) => {
  return Promise.all(
    invoices.map(async (inv) => {
      // If already has a positive total, leave as is
      if (inv.totalEnergyGenerated && inv.totalEnergyGenerated > 0) {
        inv.amountCalculated = Number((inv.totalEnergyGenerated * PRICE_PER_KWH).toFixed(2));
        return inv;
      }

      const original = inv.totalEnergyGenerated || 0;

      // Recompute total energy for the billing period as a fallback
      const agg = await EnergyGenerationRecord.aggregate([
        {
          $match: {
            solarUnitId: new Types.ObjectId(inv.solarUnitId),
            timestamp: {
              $gte: inv.billingPeriodStart,
              $lte: inv.billingPeriodEnd,
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

      const total = agg?.[0]?.totalEnergyGenerated || 0;
      inv.totalEnergyGenerated = total;
      inv.amountCalculated = Number((total * PRICE_PER_KWH).toFixed(2));

      // Persist the recomputed total to avoid recomputing next time
      if (total !== original) {
        await Invoice.updateOne(
          { _id: inv._id },
          { $set: { totalEnergyGenerated: total } }
        ).catch(() => {});
      }

      return inv;
    })
  );
};

let invoicesPrimed = false;
const ensureInvoicesPrimed = async () => {
  if (invoicesPrimed) return;
  try {
    await generateInvoices();
  } catch (err) {
    console.error("Error priming invoices:", err);
  } finally {
    invoicesPrimed = true;
  }
};

export const getAllInvoices = async (req:Request , res: Response , next : NextFunction) => {
    try {
        await ensureInvoicesPrimed();
        const invoices = await Invoice.find().sort({billingPeriodEnd : -1}).lean();
        const hydrated = await hydrateEnergyTotals(invoices);
        res.status(200).json(hydrated);
    } catch (error) {
        next(error);
    }
};


export const getInvoicesForUser = async (req:Request , res: Response , next : NextFunction) => {
    try {
        await ensureInvoicesPrimed();
        const auth = getAuth(req);
        if (!auth || !auth.userId) {
            throw new ValidationError("Unauthorized access");
        }
 
        const clerkUserId = auth.userId;
        console.log("Clerk userId:", clerkUserId); // <-- add this

        const user = await User.findOne({ clerkUserId: clerkUserId }).lean().exec();
        console.log("Found user:", user); // <-- add this


        if (!user) {
            throw new ValidationError("User not found");
        }

        const userIdObj = new Types.ObjectId(user._id);
         const userIdStr = user._id.toString();

     const userInvoices = await Invoice.find({
        $or: [{ userId: userIdObj }, { userId: userIdStr }],
        }).sort({ billingPeriodEnd: -1 }).lean();
        const hydrated = await hydrateEnergyTotals(userInvoices);
        res.status(200).json(hydrated);
        console.log("User invoices:", userInvoices); // <-- add this
    } catch (error) {
        console.error("Error in getInvoicesForUser:", error); // <-- add this
        next(error);
    }
};


export const getInvoiceById = async (req:Request , res : Response , next : NextFunction)=>{
  try {
    const {id} = req.params;
    const invoice = await Invoice.findById(id);
    if(!invoice){
        return res.status(404).json({message : "Invoice not found"});
    }
    res.status(200).json (invoice);
  } catch (error) {
    next(error);
  }
};
