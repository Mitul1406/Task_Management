import mongoose from "mongoose";

export const connectDb = async () => {
  try {
    const user = process.env.MONGO_USER;
    const pass = encodeURIComponent(process.env.MONGO_PASS || "");
    const host = process.env.MONGO_HOST;
    const db   = process.env.MONGO_DB;

    if (!user || !pass || !host || !db) {
      throw new Error("Missing MongoDB environment variables");
    }

    const MONGO_URI = `mongodb+srv://${user}:${pass}@${host}/${db}?authSource=admin`;

    console.log("Connecting to:", host, db);

    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB Atlas");
  } catch (err:any) {
    console.error("❌ MongoDB connection failed:", err.message);
  }
};
