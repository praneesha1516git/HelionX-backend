import express from "express";

import { authenticationMiddleware } from "./middlewares/authentication-middleware";
import { authorizationMiddleware } from "./middlewares/authorization-middleware"; // assumes you have one for admin
import { getAllInvoices } from "../application/invoice";


const adminRouter = express.Router();

adminRouter.route("/invoices").get(authenticationMiddleware, authorizationMiddleware, getAllInvoices);


export default adminRouter;