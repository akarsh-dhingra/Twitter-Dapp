import { fetchTweetMetadata } from "./ipfs";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001"
).replace(/\/$/, "");
export const TWEET_POLL_INTERVAL_MS = Number(
  import.meta.env.VITE_TWEETS_POLL_INTERVAL_MS || 4000
);

async function requestJson(pathname) {
  const response = await fetch(`${API_BASE_URL}${pathname}`);

  if (!response.ok) {
    const text = await response.text();

    try {
      const parsed = JSON.parse(text);
      throw new Error(parsed.message || `Backend request failed for ${pathname}`);
    } catch {
      throw new Error(text || `Backend request failed for ${pathname}`);
    }
  }

  return response.json();
}

async function fetchTweetRecordFromApi(tweetId) {
  return requestJson(`/tweets/${tweetId}`);
}

async function hydrateCachedTweet(tweet) {
  const hydratedTweet = {
    cacheKey:
      tweet.cacheKey ||
      `${tweet.deploymentId || tweet.contractAddress || "legacy"}:${tweet.tweetId}`,
    id: Number(tweet.tweetId),
    tweetId: Number(tweet.tweetId),
    deploymentId: tweet.deploymentId || "",
    contractAddress: tweet.contractAddress || "",
    chainId: Number(tweet.chainId || 0),
    author: tweet.author,
    ipfsHash: tweet.ipfsHash,
    likes: Number(tweet.likes),
    timestamp: Number(tweet.timestamp),
    content: "Unable to load tweet content from IPFS.",
    hasLiked: Boolean(tweet.hasLiked),
    isCurrentDeployment: Boolean(tweet.isCurrentDeployment)
  };

  try {
    const metadata = await fetchTweetMetadata(hydratedTweet.ipfsHash);
    hydratedTweet.content = metadata?.content || hydratedTweet.content;

    if (metadata?.timestamp) {
      hydratedTweet.timestamp = Number(metadata.timestamp);
    }
  } catch (error) {
    console.error(
      "Failed to hydrate tweet from backend cache + IPFS",
      hydratedTweet.id,
      error
    );
  }

  return hydratedTweet;
}

export async function fetchTweetsFromApi() {
  const tweets = await requestJson("/tweets");
  const hydratedTweets = await Promise.all(tweets.map((tweet) => hydrateCachedTweet(tweet)));

  return hydratedTweets.sort((left, right) => right.timestamp - left.timestamp);
}

export async function fetchTweetFromApi(tweetId) {
  const tweet = await fetchTweetRecordFromApi(tweetId);
  return hydrateCachedTweet(tweet);
}

export async function waitForTweetCacheSync(
  tweetId,
  {
    expectedLikes = null,
    timeoutMs = 12000,
    intervalMs = 1000
  } = {}
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const tweet = await fetchTweetRecordFromApi(tweetId);
      const likesMatch = expectedLikes === null || Number(tweet.likes) >= expectedLikes;

      if (likesMatch) {
        return tweet;
      }
    } catch (error) {
      console.error("Waiting for backend cache sync failed", error);
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, intervalMs);
    });
  }

  return null;
}
