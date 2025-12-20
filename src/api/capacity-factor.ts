import express from "express"
import { getCalculatedCapacityFactor } from "../application/capacity-factor";
import { authenticationMiddleware } from "./middlewares/authentication-middleware"

const capacityFactorRouter = express.Router();

capacityFactorRouter.route("/solar-unit/:id").get( getCalculatedCapacityFactor);

export default capacityFactorRouter;