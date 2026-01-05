import {z} from "zod";
import {CreateSolarUnitDto , UpdateSolarUnitDto } from "../domain/dtos/solar-unit";
import {SolarUnit} from '../infrastructure/entities/SolarUnit';
import {Request , Response, NextFunction} from "express";
import { NotFoundError , ValidationError } from "../domain/errors/errors";
import { User } from "../infrastructure/entities/User";
import {getAuth} from "@clerk/express";




export const getAllSolarUnits = async(req : Request, res: Response) => {
   try {
    const solarUnits = await SolarUnit.find();
    res.status(200).json(solarUnits);
   } catch (error) {
       res.status(500).json({ message: "internal server error" });
   }
};

export const createSolarUnitValidator = (req:Request , res:Response , next:NextFunction) =>{
    const result =CreateSolarUnitDto.safeParse(req.body); // Validate request body
    if (!result.success) { // If validation fails
       throw new ValidationError(result.error.message);
    }

    next(); // Proceed to the next middleware
};

export const getSolarUnitById = async(req: Request, res: Response) => {
    try {
        const { id } = req.params; 
        const solarUnit = await SolarUnit.findById(id);

        if (!solarUnit) {
                return res.status(404).json({ message: "Solar unit not found" });
            }
        res.status(200).json(solarUnit);

    }catch(error) {
        res.status(500).json({message: "internal server error"});
    }
    };



export const createSolarUnit = async(req: Request, res: Response , next: NextFunction) => {
    try {
    const data: z.infer<typeof CreateSolarUnitDto> = req.body; // Validate and infer the request body

    const newSolarUnit = {
        serialNumber: data.serialNumber,
        installationDate: data.installationDate,
        capacity: data.capacity,
        status: data.status,

    };

    const createSolarUnit = await SolarUnit.create(newSolarUnit)
    res.status(201).json(createSolarUnit); 
    }
    catch (error){
   next(error);
    }
}

export const getSolarUnitForUser = async (
  req: Request,
  res: Response
) => {
  try {
    const auth = getAuth(req);

    if (!auth || !auth.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const clerkUserId = auth.userId;
    console.log("Clerk User ID:", clerkUserId);

    const user = await User.findOne({ clerkUserId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const solarUnits = await SolarUnit.find({ userId: user._id.toString() });

    return res.status(200).json(solarUnits);
  } catch (error) {
    console.error("getSolarUnitForUser error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


 export const updateSolarUnitValidator = (req:Request , res:Response , next:NextFunction) =>{
    const result =UpdateSolarUnitDto.safeParse(req.body); // Validate request body
    if (!result.success) { // If validation fails
       throw new ValidationError(result.error.message);
    }

    next(); // Proceed to the next middleware
}


export const updateSolarUnit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { serialNumber, installationDate, capacity, status , userId } = req.body;
  const solarUnit = await SolarUnit.findById(id);

  if (!solarUnit) {
    throw new NotFoundError("Solar unit not found");
  }

  const updatedSolarUnit = await SolarUnit.findByIdAndUpdate(id, {
    serialNumber,
    installationDate,
    capacity,
    status,
    userId,
  });

  res.status(200).json(updatedSolarUnit);
};


export const deleteSolarUnit = async (req: Request, res: Response) => {
    try {
        const {id} = req.params ;
        const solarUnit = await SolarUnit.findById(id);
    
    if(!solarUnit) {
        return res.status(404).json({ message: "Solar unit not found" });
    }
    await SolarUnit.findByIdAndDelete(id);
    res.status(204).send();
    }
    catch(error){
        res.status(500).json({ message: "internal server error" });
    }
    
};

function next(error: unknown) {
    throw new Error("Function not implemented.");
}





