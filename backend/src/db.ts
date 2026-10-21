import mongoose from "mongoose";
import { config } from "./config.js";

export async function connectDb(): Promise<void> {
  mongoose.set("strictQuery", true);
  const atlas =
    config.mongoUri.includes("mongodb+srv://") ||
    config.mongoUri.includes("mongodb.net");

  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: atlas ? 20000 : 2500,
    });
    console.log(atlas ? "Connected to MongoDB Atlas" : "Connected to MongoDB");
    return;
  } catch (err) {
    if (!config.isDev || atlas) {
      throw err;
    }
    console.warn(
      "No MongoDB on the configured URI. Starting a local demo database (first run may download MongoDB)."
    );
  }

  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const memory = await MongoMemoryServer.create({
    instance: { dbName: "oddnext" },
  });
  await mongoose.connect(memory.getUri());
  console.log("Connected to in-memory MongoDB");
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
