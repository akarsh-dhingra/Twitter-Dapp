const { ethers } = require("ethers");
const Tweet = require("../models/Tweet");
const twitterArtifact = require("../../artifacts/contracts/Twitter.sol/Twitter.json");

let provider;
let contract;
let syncIntervalId = null;
let isSyncing = false;
let hasStarted = false;

function normalizeAddress(address = "") {
  return String(address).toLowerCase();
}

function toNumber(value, fieldName = "value") {
  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue)) {
    throw new Error(`Unable to convert ${fieldName} to a number.`);
  }

  return parsedValue;
}

function getPollingIntervalMs() {
  const configuredInterval = Number.parseInt(
    process.env.BLOCKCHAIN_SYNC_INTERVAL_MS || "2500",
    10
  );

  if (Number.isNaN(configuredInterval) || configuredInterval < 1000) {
    return 2500;
  }

  return configuredInterval;
}

function getCurrentContractAddress() {
  if (!process.env.CONTRACT_ADDRESS) {
    throw new Error("Missing CONTRACT_ADDRESS in backend/.env.");
  }

  return normalizeAddress(process.env.CONTRACT_ADDRESS);
}

function getCurrentDeploymentId() {
  const configuredDeploymentId = String(
    process.env.CONTRACT_DEPLOYMENT_ID || ""
  ).trim();

  if (configuredDeploymentId) {
    return configuredDeploymentId;
  }

  return getCurrentContractAddress();
}

function getProvider() {
  if (!process.env.RPC_URL) {
    throw new Error("Missing RPC_URL in backend/.env.");
  }

  if (!provider) {
    provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  }

  return provider;
}

function getContract() {
  if (!contract) {
    contract = new ethers.Contract(
      getCurrentContractAddress(),
      twitterArtifact.abi,
      getProvider()
    );
  }

  return contract;
}

function buildTweetDocument(tweet, deploymentMetadata) {
  return {
    deploymentId: deploymentMetadata.deploymentId,
    contractAddress: deploymentMetadata.contractAddress,
    chainId: deploymentMetadata.chainId,
    tweetId: toNumber(tweet.id, "tweet id"),
    author: normalizeAddress(tweet.author),
    ipfsHash: tweet.ipfsHash,
    likes: toNumber(tweet.likes, "likes"),
    timestamp: toNumber(tweet.timestamp, "timestamp"),
    lastSyncedAt: new Date()
  };
}

async function getDeploymentMetadata() {
  const network = await getProvider().getNetwork();

  return {
    deploymentId: getCurrentDeploymentId(),
    contractAddress: getCurrentContractAddress(),
    chainId: Number(network.chainId)
  };
}

async function migrateLegacyTweets(deploymentMetadata) {
  const migrationResult = await Tweet.updateMany(
    {
      $or: [
        { deploymentId: { $exists: false } },
        { deploymentId: null },
        { deploymentId: "" }
      ]
    },
    {
      $set: {
        deploymentId: deploymentMetadata.deploymentId,
        contractAddress: deploymentMetadata.contractAddress,
        chainId: deploymentMetadata.chainId,
        lastSyncedAt: new Date()
      }
    }
  );

  if (migrationResult.modifiedCount > 0) {
    console.log(
      `Migrated ${migrationResult.modifiedCount} legacy tweet records into deployment ${deploymentMetadata.deploymentId}.`
    );
  }
}

async function syncTweetsFromChain() {
  if (isSyncing) {
    return { skipped: true, tweetCount: 0 };
  }

  isSyncing = true;

  try {
    const deploymentMetadata = await getDeploymentMetadata();
    await migrateLegacyTweets(deploymentMetadata);

    const chainTweets = await getContract().getAllTweets();
    const tweets = Array.from(chainTweets, (tweet) =>
      buildTweetDocument(tweet, deploymentMetadata)
    );

    if (tweets.length === 0) {
      return {
        skipped: false,
        tweetCount: 0,
        deploymentId: deploymentMetadata.deploymentId
      };
    }

    await Tweet.bulkWrite(
      tweets.map((tweet) => ({
        updateOne: {
          filter: {
            deploymentId: tweet.deploymentId,
            tweetId: tweet.tweetId
          },
          update: { $set: tweet },
          upsert: true
        }
      })),
      { ordered: false }
    );

    return {
      skipped: false,
      tweetCount: tweets.length,
      latestTweetId: tweets[tweets.length - 1]?.tweetId || 0,
      deploymentId: deploymentMetadata.deploymentId
    };
  } finally {
    isSyncing = false;
  }
}

async function hasAddressLikedTweet(tweetId, address) {
  if (!address) {
    return false;
  }

  return Boolean(await getContract().hasLiked(tweetId, address));
}

async function startBlockchainSync() {
  if (hasStarted) {
    return async () => {};
  }

  const intervalMs = getPollingIntervalMs();
  const initialSnapshot = await syncTweetsFromChain();

  syncIntervalId = setInterval(() => {
    syncTweetsFromChain().catch((error) => {
      console.error("Blockchain sync polling failed", error);
    });
  }, intervalMs);

  hasStarted = true;
  console.log(
    `Blockchain sync started for deployment ${initialSnapshot.deploymentId || getCurrentDeploymentId()}. Indexed ${initialSnapshot.tweetCount} tweets. Polling every ${intervalMs}ms.`
  );

  return async () => {
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
      syncIntervalId = null;
    }

    hasStarted = false;
  };
}

module.exports = {
  hasAddressLikedTweet,
  getCurrentContractAddress,
  getCurrentDeploymentId,
  startBlockchainSync,
  syncTweetsFromChain
};
