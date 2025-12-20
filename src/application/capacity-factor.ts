import mongoose from "mongoose";
import { GetAllEnergyGenerationRecordsQueryDto } from "../domain/dtos/solar-unit";
import { ValidationError } from "../domain/errors/errors";
import { EnergyGenerationRecord } from "../infrastructure/entities/EnergyGenerationRecord";
import { SolarUnit } from "../infrastructure/entities/SolarUnit";
import { NextFunction, Request , Response } from "express";

export const getCalculatedCapacityFactor = async (req:Request , res: Response , next : NextFunction) => {
    try {
        // Get the solar unit ID from the request parameters
       const { id } =req.params;
       // validate id
       if (!id || id === "undefined" || !mongoose.isValidObjectId(id)) {
           throw new ValidationError("Invalid or missing solar unit id");
       }

       const solarUnit = await SolarUnit.findById(id);
       if(!solarUnit){
        throw new ValidationError("Solar unit not found");
       }

       const ratedCapacity = solarUnit.capacity ; // in kW
       if(!ratedCapacity || ratedCapacity <=0){
        throw new ValidationError ("Invalid rated capacity for the solar unit");
       }

       const result = GetAllEnergyGenerationRecordsQueryDto.safeParse(req.query);
       if(!result.success) {
        throw new ValidationError("Invalid query parameters");
       }

       //get groupBy and limit from query parameters
       const {groupBy, limit } = result.data;

       if (groupBy !== "date"){
        throw new ValidationError("Capacity factor can only be calculated with groupBy=date");
       }



       //build aggregation pipeline
       const matchStage = {
        $match : {
            solarUnitId : new mongoose.Types.ObjectId(id),
        },
       };

        const groupStage = {
            $group : {
                _id : {
                    date : {
                        $dateToString : { format : "%Y-%m-%d", date : "$timestamp" },
                    },
                },
                totalEnergy : { $sum : "$energyGenerated" }, // in kWh
            },
        };

        const sortStage = {
            $sort : { "_id.date" : -1},
        };

        //build the pipeline array- any type array
        const pipeline : any[] = [matchStage, groupStage, sortStage];
        if(limit) {
            const parsed = parseInt(limit);
            if(!isNaN(parsed) && parsed <= 0){
                throw new ValidationError("Limit must be a positive integer");
        }
            pipeline.push({ $limit : parsed });
                }

        //get aggregated records by passing the pipeline to the aggregate function        
        const aggregatedRecords = await EnergyGenerationRecord.aggregate(pipeline);

        //calculate capacity factor for each record
        const capacityFactorRecords = aggregatedRecords.map((record) => {
            const date = record._id.date;
            const totalEnergy = record.totalEnergy; // in kWh
            const capacityFactor = (totalEnergy / (ratedCapacity * 24)) * 100; // in percentage
            return {
                date,
                capacityFactor : parseFloat (capacityFactor.toFixed(2)), // round to 2 decimal places
            }; 
        });

        console.log(capacityFactorRecords);
        return res.status(200).json(capacityFactorRecords);
        
    }catch (error) {
        next(error);
    }
    
};