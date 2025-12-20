import { EnergyGenerationRecord } from "../../infrastructure/entities/EnergyGenerationRecord";
import { Anomaly } from "../../infrastructure/entities/Anomaly";
import mongoose from "mongoose";
import { SolarUnit } from "../../infrastructure/entities/SolarUnit";



const ESP = 0.01;
const EXPECTED_INTERVALS = 12;
const FLAT_VAR = 0.001;
const MIDDAY_FACTOR = 0.5;
const ROLLING_WINDOW = 7;
const DEGRADATION_SLOPE = -0.1;
const LOOKBACK_MONTHS = 2;




type DayBucket =  {
    dateKey : String;
    count : number;
    records : {ts:Date ; hour:number ; energy : number}[];
};

// { exaple DayBucket
//   dateKey: "2025-08-02",
//   count: 12,
//   records: [
//     { ts: "2025-08-02T06:00:00Z", hour: 6, energy: 2 },
//     { ts: "2025-08-02T08:00:00Z", hour: 8, energy: 5 },
//   
//   ]
// }

const isDaylight = (hour: number) => hour>=6 && hour <=18;
const isMidday = (hour: number) => hour>=10 && hour <=14;
const  isNight = (hour: number) => hour <6 || hour >18;

const variance = (vals : number[]) => {
    if(!vals.length) return 0;
    const m = vals.reduce((a,b) => a + b, 0) / vals.length;
    return vals.reduce((a,b) => a + (b-m)**2 , 0 ) / vals.length;
};

const IQR = (vals : number[]) => {
    if(!vals.length) return 0;
    const sorted = [...vals].sort((a,b) => a - b);
    if(sorted.length < 4) return Number.MAX_VALUE;
    const q1 = sorted[Math.floor((sorted.length * 0.25))];
    const q3 = sorted[Math.floor((sorted.length * 0.75))];
    return q3 + 1.5 * (q3 - q1);
}

const slope = (vals : number[]) => {
    if(vals.length <2) return 0;
    const x = Array.from({ length: vals.length }, (_, i) => i);
    const meanX = x.reduce((a,b) => a + b, 0) / x.length;
    const meanY = vals.reduce((a,b) => a + b, 0) / vals.length;
    const num = x.reduce((acc, xi, i) => acc + (xi - meanX) * (vals[i] - meanY), 0); //covariance between time and energy production
    const den = x.reduce((s, xi) => s + (xi - meanX) ** 2, 0) || 1;  //variance of time
    return num / den ;

};

const saveAnomaly = async (
  solarUnitId: mongoose.Types.ObjectId,
  type: string,
  name: string,
  desc: string,
  severity: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM",
  detectionTimestamp?: Date
) => {
  // Prevent duplicates for same unit/type/name within the same day
  const ts = detectionTimestamp || new Date();
  const dayStart = new Date(Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), ts.getUTCDate(), 0, 0, 0, 0));
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const existing = await Anomaly.findOne({
    solarUnitId,
    anomalyType: type,
    anomalyName: name,
    detectionTimestamp: { $gte: dayStart, $lt: dayEnd },
  }).lean();
  if (existing) return;

  await Anomaly.create({
    solarUnitId,
    anomalyType: type,
    anomalyName: name,
    severity,
    description: desc,
    detectionTimestamp: ts,
  });
};

export const detectAnomalies = async () => {
  // per-day cap for anomalies
  const DAILY_LIMIT = 3;
  const defaultSince = new Date();
  defaultSince.setMonth(defaultSince.getMonth() - LOOKBACK_MONTHS);

  // Fetch all active solar units with installation date
  const units = await SolarUnit.find({ status: "ACTIVE" })
    .select({ _id: 1, installationDate: 1 })
    .lean();

  for (const unit of units) {
    // track anomalies emitted per day for this unit (UTC day)
    const perDayCount = new Map<string, number>();
    const emit = async (
      type: string,
      name: string,
      desc: string,
      severity: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM",
      dateKey?: string,
      detectionTs?: Date
    ) => {
      const key = dateKey || new Date().toISOString().slice(0, 10);
      const count = perDayCount.get(key) || 0;
      if (count >= DAILY_LIMIT) return;
      await saveAnomaly(unit._id, type, name, desc, severity, detectionTs);
      perDayCount.set(key, count + 1);
    };

    // Determine since: if anomalies exist, start from last anomaly (with 1-day buffer); else from installation or default
    let sinceForUnit = new Date(defaultSince);
    const lastAnomaly = await Anomaly.findOne({ solarUnitId: unit._id })
      .sort({ detectionTimestamp: -1 })
      .select({ detectionTimestamp: 1 })
      .lean();
    if (lastAnomaly?.detectionTimestamp) {
      sinceForUnit = new Date(lastAnomaly.detectionTimestamp);
      // small buffer to re-check around last detection
      sinceForUnit = new Date(sinceForUnit.getTime() - 24 * 60 * 60 * 1000);
    } else if (unit.installationDate) {
      sinceForUnit = new Date(unit.installationDate);
    }

    // Aggregate energy generation records into daily buckets from sinceForUnit
    const dailyBuckets = await EnergyGenerationRecord.aggregate<DayBucket>([
      {
        $match: {
          solarUnitId: unit._id,
          timestamp: { $gte: sinceForUnit },
        },
      },
        {
            $addFields : {
                dateKey : {
                    $dateToString : { format : "%Y-%m-%d" , date : "$timestamp" },
                },
                hour : { $hour : "$timestamp" },
            },
        },

        {
            $group : {
                _id : {dateKey : "$dateKey" },
                dateKey : { $first : "$dateKey" },
                count : { $sum : 1 },
                records : {
                    $push : {
                        ts : "$timestamp",
                        hour : "$hour",
                        energy : "$energyGenerated",
                    },
                },
            }, 
        },
        { $sort : { dateKey : 1 } },
    ]);

    // If no data exists for this unit in the lookback window, emit a data quality anomaly
    if (dailyBuckets.length === 0) {
      await emit(
        "Data Quality Anomaly",
        "No Recent Energy Data",
        `No energy generation records found for this solar unit since ${sinceForUnit.toISOString().slice(0, 10)}.`,
        "LOW"
      );
      continue;
    }

    //DUPLICATE CHECK 
    const duplicates = await EnergyGenerationRecord.aggregate([
      { $match: { solarUnitId: unit._id, timestamp: { $gte: sinceForUnit } } },
      { $group: { _id: { ts: "$timestamp" }, cnt: { $sum: 1 } } },
      { $match: { cnt: { $gt: 1 } } },
      { $limit: 1 },
    ]);

     if (duplicates.length > 0) {
        await emit(
            "DUPLICATE_RECORDS",
            "Duplicate Energy Generation Records",
            "There are duplicate energy generation records for this solar unit within the lookback period.",
            "LOW",
            undefined,
            new Date()
        );
     }


    //HISTORICAL STATS FOR NOON PEAK AND DEGRADATION
     const middyaMaxes: number[] = [];
    const dailyPeaks : {dateKey: string ; peak : number}[] = [];

    dailyBuckets.forEach((d) =>  {
        const middayVals = d.records.filter((r) => isMidday(r.hour)).map((r) => r.energy);
        const peak = d.records.length ? Math.max(...d.records.map((r) => r.energy)) : 0;
        middyaMaxes.push(middayVals.length ? Math.max(...middayVals) : 0);
        dailyPeaks.push({ dateKey: d.dateKey.toString(), peak });
    });

    
  const histMiddayMean = middyaMaxes.length ? middyaMaxes.reduce((a,b) => a + b, 0) / middyaMaxes.length : 0;
  dailyPeaks.sort((a,b) => (a.dateKey < b.dateKey ? -1 : 1));


 //gradual degradation check
 for (let i = ROLLING_WINDOW; i < dailyPeaks.length; i++) {
    const window = dailyPeaks.slice(i - ROLLING_WINDOW + 1 , 1 + i).map((d) => d.peak);
    const m = slope(window);
    if (m < DEGRADATION_SLOPE) {
        await emit(
            "Collective Anomaly",
            "Gradual Degradation Detected",
            `A gradual degradation in energy production has been detected over the past ${ROLLING_WINDOW} days.`,
            "MEDIUM",
            dailyPeaks[i].dateKey ? dailyPeaks[i].dateKey.toString() : undefined,
            new Date(dailyPeaks[i].dateKey)
        );
    }
 }


//per day anomaly checks
for (const day of dailyBuckets) {
    const energies = day.records.map((r) => r.energy);
    const dayLightVals = day.records.filter((r) => isDaylight(r.hour)).map((r) => r.energy);
    const nightVals = day.records.filter((r) => isNight(r.hour)).map((r) => r.energy);
    const middayVals = day.records.filter((r) => isMidday(r.hour)).map((r) => r.energy);

    //MISSING DATA CHECK
    if(day.count < EXPECTED_INTERVALS) {
        await emit(
            "Data Quality Anomaly",
            "Missing Energy Generation Data",
            `Only ${day.count} energy generation records found for ${day.dateKey}, expected ${EXPECTED_INTERVALS}.`,
            "MEDIUM",
            day.dateKey.toString(),
            new Date(`${day.dateKey}T00:00:00Z`)
        );
    }

    //spike detection
    if (dayLightVals.length >=0) {
        const limit = IQR(dayLightVals);
        day.records.filter((r) => isDaylight(r.hour) && r.energy > limit).forEach((r) => {
            emit(
                "Point Anomaly",
                "Energy Spike Detected",
                `An energy spike of ${r.energy} units detected at ${r.ts.toISOString()} on ${day.dateKey}.`,
                "HIGH",
                day.dateKey.toString(),
                new Date(r.ts)
            );
        }); 
        
    }

    //sudeen drop detection
    day.records.filter((r) => isDaylight(r.hour) && r.energy < ESP).forEach((r) => {
        emit(
            "Point Anomaly",
            "Sudden Drop in Energy Generation",
            `A sudden drop in energy generation to ${r.energy} units detected at ${r.ts.toISOString()} on ${day.dateKey}.`,
            "HIGH",
            day.dateKey.toString(),
            new Date(r.ts)
        );
    });

    //night time energy generation detection
    if(nightVals.some((v) => v > ESP)) {
        await emit(
            "Contextual Anomaly",
            "Unexpected Nighttime Energy Generation",
            `Energy generation values above expected threshold detected during nighttime on ${day.dateKey}.`,
            "MEDIUM",
            day.dateKey.toString(),
            new Date(`${day.dateKey}T18:00:00Z`)
        );
    }

    //flat line 
    if(variance(energies) < FLAT_VAR) {
        await emit(
            "Collective Anomaly",
            "Flat Line Energy Generation Detected",
            `Low variance (${variance(energies).toFixed(4)}) in energy generation values detected on ${day.dateKey}.`,
            "MEDIUM",
            day.dateKey.toString(),
            new Date(`${day.dateKey}T12:00:00Z`)
        );
    }

    //missing noon peak 
    const middayMax = middayVals.length ? Math.max(...middayVals) : 0;
    if(histMiddayMean > 0 && middayMax < MIDDAY_FACTOR * histMiddayMean) {
        await emit(
            "Collective Anomaly",
            "Missing Midday Peak in Energy Generation",
            `The maximum energy generation during midday (${middayMax} units) is significantly lower than the historical average (${histMiddayMean.toFixed(2)} units) on ${day.dateKey}.`,
            "LOW",
            day.dateKey.toString(),
            new Date(`${day.dateKey}T12:00:00Z`)
        );
    }
 


}
}


};
