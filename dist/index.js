"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
var db_1 = require("./infrastructure/db");
var express_1 = __importDefault(require("express"));
var solar_unit_1 = __importDefault(require("./api/solar-unit"));
var energy_generation_record_1 = __importDefault(require("./api/energy-generation-record"));
var server = (0, express_1.default)();
server.use(express_1.default.json()); // Middleware to parse JSON bodies - convert json to js object and store in
server.use("/api/solar-units", solar_unit_1.default);
server.use("/api/energy-generation-records", energy_generation_record_1.default);
(0, db_1.connectDB)();
var PORT = 8002;
server.listen(PORT, function () {
    console.log("Server is running on http://localhost:".concat(PORT));
});
//identify the resources
/*
Solar unit
energy generation record
user
house
*/
//# sourceMappingURL=index.js.map