import mongoose from "mongoose";

const anomalySchema = new mongoose.Schema({
    solarUnitId :  {
        type : mongoose.Schema.Types.ObjectId,
        ref : "SolarUnit",
        required :true
    },
 
    anomalyType : {
        type : String,

    },

    anomalyName : {
        type : String,
    },

    severity : {
        type : String,
        enum : ["LOW" , "MEDIUM" , "HIGH"],
    },
   
   detectionTimestamp : {
        type : Date,
        default : Date.now
   },

   description : {
        type : String,
   },

   resolvedStatus : {
    type : Boolean,
    default : false
   },




});


export const Anomaly = mongoose.model("Anomaly" , anomalySchema);