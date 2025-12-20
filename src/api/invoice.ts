import express from "express";
import { getAllInvoices , getInvoicesForUser,getInvoiceById } from "../application/invoice";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";
import { authorizationMiddleware } from "./middlewares/authorization-middleware";

const invoiceRouter = express.Router();


invoiceRouter.route("/").get( authenticationMiddleware, getInvoicesForUser);

invoiceRouter.route("/:id").get( authenticationMiddleware, getInvoiceById);

invoiceRouter.route("/admin").get( authenticationMiddleware, authorizationMiddleware, getAllInvoices);

export default invoiceRouter;