import { fetchWeatherApi } from "openmeteo";
import { Request, Response, NextFunction } from "express";
import { Resolver } from "dns";

export const fetchWeatherData = async(req : Request, res: Response , next:NextFunction) => {
 
	try {



		const params = {
			latitude: 6.8617,
			longitude: 79.9619,
			current: ["temperature_2m", "relative_humidity_2m", "is_day", "wind_speed_10m", "rain", "weather_code", "cloud_cover"],
			timezone: "auto",
		};
		const url = "https://api.open-meteo.com/v1/forecast";
		const weather = await fetchWeatherApi(url, params);
		
		// Process first location. Add a for-loop for multiple locations or weather models
		const response = weather[0];
		
		// Attributes for timezone and location
		const latitude = response.latitude();
		const longitude = response.longitude();
		const elevation = response.elevation();
		const timezone = response.timezone();
		const timezoneAbbreviation = response.timezoneAbbreviation();
		const utcOffsetSeconds = response.utcOffsetSeconds();
		
		console.log(
			`\nCoordinates: ${latitude}°N ${longitude}°E`,
			`\nElevation: ${elevation}m asl`,
			`\nTimezone: ${timezone} ${timezoneAbbreviation}`,
			`\nTimezone difference to GMT+0: ${utcOffsetSeconds}s`,
		);
		
		const current = response.current()!;
		
		// Note: The order of weather variables in the URL query and the indices below need to match!
		const weatherData = {
			current: {
				time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
				temperature_2m: current.variables(0)!.value(),
				relative_humidity_2m: current.variables(1)!.value(),
				is_day: current.variables(2)!.value(),
				wind_speed_10m: current.variables(3)!.value(),
				rain: current.variables(4)!.value(),
				weather_code: current.variables(5)!.value(),
				cloud_cover: current.variables(6)!.value(),
			},
		};
		
		// The 'weatherData' object now contains a simple structure, with arrays of datetimes and weather information
		// console.log(
		// 	`\nCurrent time: ${weatherData.current.time}\n`,
		// 	`\nCurrent temperature_2m: ${weatherData.current.temperature_2m}`,
		// 	`\nCurrent relative_humidity_2m: ${weatherData.current.relative_humidity_2m}`,
		// 	`\nCurrent is_day: ${weatherData.current.is_day}`,
		// 	`\nCurrent wind_speed_10m: ${weatherData.current.wind_speed_10m}`,
		// 	`\nCurrent rain: ${weatherData.current.rain}`,
		// 	`\nCurrent weather_code: ${weatherData.current.weather_code}`,
		// 	`\nCurrent cloud_cover: ${weatherData.current.cloud_cover}`,
		
		// );
		
		res.status(200).json(weatherData);
	} catch (error) {
	   next(error);
	}

}