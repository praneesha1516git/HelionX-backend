import "dotenv/config";
import express from 'express';
import energyGenerationRecordRouter from './api/energy-generation-record'
import { globalErrorHandler } from "./api/middlewares/global-error-handling-middleware";
import { loggerMiddleware } from "./api/middlewares/logger-middleware";
import solarUnitRouter from './api/solar-unit';
import { connectDB } from "./infrastructure/db";
import { initializeScheduler } from "./infrastructure/sheduler";
import cors from "cors"
import webhooksRouter from "./api/webhooks";
import { clerkMiddleware } from "@clerk/express";
import usersRouter from "./api/users";

const server = express();
server.use(cors({origin:"http://localhost:5173"}));  // Enable CORS

server.use(loggerMiddleware);  // Middleware to log requests

server.use("/api/webhooks", webhooksRouter);  // Routes for webhooks - middleware

server.use(clerkMiddleware());  // Clerk authentication middleware

server.use(express.json()); // Middleware to parse JSON bodies - convert json to js object and store in

server.use("/api/solar-units", solarUnitRouter);  // Routes for solar units - middleware
server.use("/api/energy-generation-records", energyGenerationRecordRouter);  // Routes for energy generation records - middleware
server.use("/api/users", usersRouter);  // Routes for users - middleware

server.use(globalErrorHandler);  // no response generated from above router middlewares = Global error handling middleware

connectDB();  // Connect to the database
initializeScheduler();  // Initialize background job scheduler

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});       


//identify the resources
/* 
Solar unit
energy generation record
user
house
*/


