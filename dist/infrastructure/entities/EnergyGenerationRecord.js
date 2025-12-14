"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnergyGenerationRecord = void 0;
var mongoose_1 = __importDefault(require("mongoose"));
var energyGenerationRecordSchema = new mongoose_1.default.Schema({
    solarUnitId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "SolarUnit",
        required: true
    },
    energyGenerated: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    intervalHours: {
        type: Number,
        default: 2,
        min: 0.1,
        max: 2.4
    },
});
exports.EnergyGenerationRecord = mongoose_1.default.model("EnergyGenerationRecord", energyGenerationRecordSchema);
//# sourceMappingURL=EnergyGenerationRecord.js.map