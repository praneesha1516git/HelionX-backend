import {z} from "zod";
 
// DTO for creating a new solar unit
export const CreateSolarUnitDto = z.object ({
    serialNumber: z.string().min(1),
    installationDate: z.string().min(1),
    capacity: z.number().min(0),
    status: z.enum(["ACTIVE", "INACTIVE" , "MAINTENANCE"]),

    
});

export const UpdateSolarUnitDto = z.object ({
    serialNumber: z.string().min(1),
    installationDate: z.string().min(1),
    capacity: z.number().min(0),
    status: z.enum(["ACTIVE", "INACTIVE" , "MAINTENANCE"]),
    userId: z.string().min(1),
});



// DTO for querying energy generation records with optional grouping and limit
export const GetAllEnergyGenerationRecordsQueryDto = z.object ({
    groupBy : z.enum (["date"]).optional(),
    limit : z.string().min(1),
})