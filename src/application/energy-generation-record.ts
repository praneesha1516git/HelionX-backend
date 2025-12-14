import { format } from "path";
import { GetAllEnergyGenerationRecordsQueryDto } from "../domain/dtos/solar-unit";
import { ValidationError } from "../domain/errors/errors";
import { EnergyGenerationRecord } from "../infrastructure/entities/EnergyGenerationRecord";
import { NextFunction, Request , Response } from "express";

export const getAllEnergyGenerationRecordsBySolarUnitId = async (req:Request , res: Response , next : NextFunction) => {
 
    try {
        // Get the solar unit ID and groupBy query parameter
        //here req means request which is coming from the client side which is sending the request to the server 
       const { id } =req.params;
       const results = GetAllEnergyGenerationRecordsQueryDto.safeParse(req.query);
       if(!results.success) {
        throw new ValidationError("Invalid query parameters");
       }

       const { groupBy, limit } = results.data;



       // If no groupBy parameter is provided, return all records
       if (!groupBy){
           const energyGrnerationRecords = await EnergyGenerationRecord.find({
            solarUnitId : id,
           }).sort({timestamp : -1});
           res.status(200).json(energyGrnerationRecords);
       }

       // If groupBy is "date", aggregate the records by date
       if (groupBy === "date"){
          if(!limit){
              const energyGenerationRecords = await EnergyGenerationRecord.aggregate ([
               {
                   $group : {
                       _id : {
                           date : {
                               $dateToString : { format : "%Y-%m-%d", date : "$timestamp" },
                           },
                       },
                       totalEnergy : { $sum : "$energyGenerated" },
                   },
               }, 
                {
                    $sort : { "_id.date" : -1},
                       
                },
              ]);
              res.status(200).json(energyGenerationRecords);
          }
          }

         
            const energyGeneratrionRecords = await EnergyGenerationRecord.aggregate ([
                {
                    $group : {
                        _id : {
                            date : {
                                $dateToString : { format : "%Y-%m-%d", date : "$timestamp" },
                            },
                        },
                        totalEnergy : { $sum : "$energyGenerated" },
                    },
                }, 
                 {
                     $sort : { "_id.date" : -1},
                        
                 },
                 {
                    $limit : parseInt (limit),
                 },
               ]);
               res.status(200).json(energyGeneratrionRecords);
          

    } catch (error) {
        next(error);
    }

};

