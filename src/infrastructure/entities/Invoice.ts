import mongoose, { mongo } from "mongoose";

const invoiceSchema = new mongoose.Schema ({
       solarUnitId : {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SolarUnit",
            required:true
        },

        userId : {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required:true
        },

        billingPeriodStart : {
            type: Date,
            required:true
        },

        billingPeriodEnd : {
            type: Date,
            required:true
        },

        totalEnergyGenerated : {
            type:Number,
            required:true   
        },

        paymentStatus : {
            type:String,
            enum: ["PENDING", "PAID", "FAILED"],
            default: "PENDING"
        },

        paidAt : {
            type :Date,
        },

        timestamp: {
        type: Date,
        default: Date.now
    },
});

export const Invoice = mongoose.model("Invoice" , invoiceSchema);