import express from "express";
import { fetchWeatherData } from "../application/weather-data";

const weatherDataRouter = express.Router();

weatherDataRouter.route("/").get(fetchWeatherData);



export default weatherDataRouter;