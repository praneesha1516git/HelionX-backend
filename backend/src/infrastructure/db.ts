import mongoose from "mongoose"

export const connectDB = async () => {
    try{
        console.log("connecting to mongoDB");
        const MONGO_URI = process.env.MONGO_URI;
        if(!MONGO_URI)
            throw new Error("MONGO_URI is not defined");
        await mongoose.connect(MONGO_URI);
        console.log("connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
};