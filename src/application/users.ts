import { NextFunction , Request , Response } from "express";
import { clerkClient } from "@clerk/express";

const parseNumber = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};


export const getAllUsers = async(req : Request, res: Response , next:NextFunction) => {
    try {
        const limit = Math.min(Math.max(parseNumber(req.query.limit, 50), 1), 100);
        const offset = Math.max(parseNumber(req.query.offset, 0), 0);

        const clerkUsers = await clerkClient.users.getUserList({ limit, offset });

        const users = clerkUsers.data.map((user) => ({
            _id: user.id,
            email: user.emailAddresses?.[0]?.emailAddress ?? null,
            firstName: user.firstName,
            lastName: user.lastName,
            publicMetadata: user.publicMetadata,
            lastSignInAt: user.lastSignInAt,
            createdAt: user.createdAt,
        }));

        // Preserve backwards-compatible array response while exposing total count via header
        res.setHeader("X-Total-Count", clerkUsers.totalCount.toString());
        res.status(200).json(users);
    } catch (error) {
       next(error);
    }
};
