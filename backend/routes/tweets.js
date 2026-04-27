const express = require("express");
const Tweet = require("../models/Tweet");
const {
  getCurrentContractAddress,
  getCurrentDeploymentId,
  hasAddressLikedTweet
} = require("../services/blockchainSync");

const router = express.Router();

function normalizeAddress(address = "") {
  return address.toLowerCase();
}

function isHexAddress(address = "") {
  return /^0x[a-f0-9]{40}$/i.test(address);
}

function serializeTweet(tweet) {
  const currentDeploymentId = getCurrentDeploymentId();
  const currentContractAddress = getCurrentContractAddress();
  const isCurrentDeployment =
    tweet.deploymentId === currentDeploymentId &&
    normalizeAddress(tweet.contractAddress) === currentContractAddress;

  return {
    ...tweet,
    cacheKey: `${tweet.deploymentId}:${tweet.tweetId}`,
    isCurrentDeployment
  };
}

router.get("/", async (_request, response, next) => {
  try {
    const tweets = await Tweet.find()
      .sort({ timestamp: -1, tweetId: -1 })
      .lean();

    response.json(tweets.map(serializeTweet));
  } catch (error) {
    next(error);
  }
});

router.get("/user/:address", async (request, response, next) => {
  try {
    const address = normalizeAddress(request.params.address);

    if (!isHexAddress(address)) {
      response.status(400).json({ message: "Wallet address is invalid." });
      return;
    }

    const currentDeploymentId = getCurrentDeploymentId();
    const currentContractAddress = getCurrentContractAddress();
    const tweets = await Tweet.find({
      deploymentId: currentDeploymentId,
      contractAddress: currentContractAddress
    })
      .sort({ timestamp: -1, tweetId: -1 })
      .lean();

    const likedTweets = await Promise.all(
      tweets.map(async (tweet) => {
        const hasLiked = await hasAddressLikedTweet(tweet.tweetId, address);
        return hasLiked ? { ...serializeTweet(tweet), hasLiked } : null;
      })
    );

    response.json(likedTweets.filter(Boolean));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (request, response, next) => {
  try {
    const tweetId = Number.parseInt(request.params.id, 10);

    if (Number.isNaN(tweetId)) {
      response.status(400).json({ message: "Tweet id must be a number." });
      return;
    }

    const tweet = await Tweet.findOne({
      deploymentId: getCurrentDeploymentId(),
      contractAddress: getCurrentContractAddress(),
      tweetId
    }).lean();

    if (!tweet) {
      response.status(404).json({ message: "Tweet not found." });
      return;
    }

    response.json(serializeTweet(tweet));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
