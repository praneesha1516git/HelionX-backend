"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var energy_generation_record_1 = require("../application/energy-generation-record");
var energyGenerationRecordRouter = express_1.default.Router();
energyGenerationRecordRouter.route("/solar-unit/:id").get(energy_generation_record_1.getAllEnergyGenerationRecordsBySolarUnitId);
exports.default = energyGenerationRecordRouter;
//# sourceMappingURL=energy-generation-record.js.map