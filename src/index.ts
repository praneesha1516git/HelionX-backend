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
import weatherDataRouter from "./api/weather-data";
import capacityFactorRouter from "./api/capacity-factor";
import adminRouter from "./api/admin";
import invoiceRouter from "./api/invoice";
import { handleStripeWebhook } from "./application/payment";
import paymentRouter from "./api/payment";
import anomalyRouter from "./api/anomaly";

const server = express();
// Normalise to avoid trailing slashes causing CORS origin mismatches
const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, "");
server.use(cors({ origin: frontendUrl }));  // Enable CORS using URL from .env (FRONTEND_URL)

server.use(loggerMiddleware);  // Middleware to log requests

server.use("/api/webhooks", webhooksRouter);  // Routes for webhooks - middleware

server.use(clerkMiddleware());  // Clerk authentication middleware

server.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);



server.use(express.json()); // Middleware to parse JSON bodies - convert json to js object and store in

server.use("/api/weather-data", weatherDataRouter);  // Routes for weather data - middleware
server.use("/api/capacity-factor", capacityFactorRouter);  // Routes for capacity factor - middleware

server.use("/api/solar-units", solarUnitRouter);  // Routes for solar units - middleware
server.use("/api/energy-generation-records", energyGenerationRecordRouter);  // Routes for energy generation records - middleware
server.use("/api/users", usersRouter);  // Routes for users - middleware
server.use("/api/anomalies", anomalyRouter);  // Routes for anomalies - middleware

server.use("/api/invoices", invoiceRouter);  // Routes for invoices - middleware
server.use("/api/admin", adminRouter);  // Routes for admin - middleware
// server.use("/api/admin/anomalies", anomalyRouter);  // Routes for admin anomalies - middleware
server.use("/api/payments", paymentRouter);  // Routes for payments - middleware

server.use(globalErrorHandler);  // no response generated from above router middlewares = Global error handling middleware

connectDB();  // Connect to the database
initializeScheduler();  // Initialize background job scheduler

const PORT = 8000;
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

