import { getAuth } from "@clerk/express";
import {  Request, Response , NextFunction } from "express";
import { ForbiddenError, UnauthorizedError } from "../../domain/errors/errors";
import { UserPublicMetadata } from "../../domain/types";


export const authorizationMiddleware = async (req:Request , res:Response , next:NextFunction) => {
    const auth = getAuth(req);

    if(!auth.userId){
        throw new UnauthorizedError("User is not authenticated");
    }

    const publicMetadata = auth.sessionClaims?.metadata as UserPublicMetadata;

    if(publicMetadata.role !== "admin"){
        throw new ForbiddenError("User does not have sufficient permissions");
    }
    next();
};
