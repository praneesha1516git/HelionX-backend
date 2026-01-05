import express from "express";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";
import { authorizationMiddleware } from "./middlewares/authorization-middleware";
import { getAllUsers } from "../application/users";

const usersRouter = express.Router();

usersRouter.route("/").get(authenticationMiddleware, authorizationMiddleware, getAllUsers);




export default usersRouter;
