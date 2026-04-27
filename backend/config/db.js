const mongoose = require("mongoose");
const Tweet = require("../models/Tweet");

async function connectDB() {
  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI in backend/.env.");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(process.env.MONGO_URI);
  await Tweet.syncIndexes();

  console.log("MongoDB connected");
}

module.exports = connectDB;
