const mongoose = require("mongoose");

const tweetSchema = new mongoose.Schema(
  {
    deploymentId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    contractAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    chainId: {
      type: Number,
      required: true,
      index: true
    },
    tweetId: {
      type: Number,
      required: true,
      index: true
    },
    author: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    ipfsHash: {
      type: String,
      required: true,
      trim: true
    },
    likes: {
      type: Number,
      required: true,
      default: 0
    },
    timestamp: {
      type: Number,
      required: true,
      index: true
    },
    lastSyncedAt: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

tweetSchema.index({ deploymentId: 1, tweetId: 1 }, { unique: true });
tweetSchema.index({ timestamp: -1, lastSyncedAt: -1, tweetId: -1 });
tweetSchema.index({ contractAddress: 1, timestamp: -1 });

module.exports = mongoose.model("Tweet", tweetSchema);
