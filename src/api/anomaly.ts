import express from "express";
import { getMyAnomalies, getAllAnomalies, getMyAnomalyTrends, getAllAnomalyTrends } from "../application/anomaly";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";
import { authorizationMiddleware } from "./middlewares/authorization-middleware"; // assumes you have one for admin


const anomalyRouter = express.Router();
anomalyRouter.route("/").get(authenticationMiddleware, getMyAnomalies);
anomalyRouter.route("/admin").get(authenticationMiddleware, authorizationMiddleware, getAllAnomalies);
anomalyRouter.route("/trends").get(authenticationMiddleware, getMyAnomalyTrends);
anomalyRouter.route("/admin/trends").get(authenticationMiddleware, authorizationMiddleware, getAllAnomalyTrends);


export default anomalyRouter;
