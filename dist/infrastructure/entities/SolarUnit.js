"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolarUnit = void 0;
var mongoose_1 = __importDefault(require("mongoose"));
var solarUnitSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    serialNumber: {
        type: String,
        required: true,
        unique: true,
    },
    installationDate: {
        type: Date,
        required: true,
    },
    capacity: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        required: true,
        enum: ["ACTIVE", "INACTIVE", "MAINTENANCE"],
    },
});
exports.SolarUnit = mongoose_1.default.model("SolarUnit", solarUnitSchema);
//# sourceMappingURL=SolarUnit.js.map