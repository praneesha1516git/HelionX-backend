"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var solar_unit_1 = require("../application/solar-unit");
var solarUnitRouter = express_1.default.Router();
// Define routes for solar units
solarUnitRouter.route("/").get(solar_unit_1.getAllSolarUnits).post(solar_unit_1.createSolarUnit);
solarUnitRouter.route("/:id").get(solar_unit_1.getSolarUnitById).put(solar_unit_1.updateSolarUnit).delete(solar_unit_1.deleteSolarUnit);
exports.default = solarUnitRouter;
//# sourceMappingURL=solar-unit.js.map