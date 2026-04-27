import { startTransition, useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import CreateTweet from "./pages/CreateTweet";
import {
  TWEET_POLL_INTERVAL_MS,
  fetchTweetsFromApi,
  waitForTweetCacheSync
} from "./utils/api";
import { uploadTweetMetadata } from "./utils/ipfs";
import {
  EXPECTED_NETWORK_NAME,
  connectWallet,
  createTweet,
  decorateTweetsWithLikeState,
  getExistingConnection,
  getReceiptEventValue,
  getReadableError,
  likeTweet
} from "./utils/web3";

const DEFAULT_STATUS = `Connect MetaMask on ${EXPECTED_NETWORK_NAME} to publish tweets and likes. Feed data is served from the backend cache.`;

function App() {
  const [walletInstalled, setWalletInstalled] = useState(Boolean(window.ethereum));
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [tweets, setTweets] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [likeLoadingId, setLikeLoadingId] = useState("");
  const [statusMessage, setStatusMessage] = useState(DEFAULT_STATUS);
  const [errorMessage, setErrorMessage] = useState("");

  async function refreshTweets(
    activeAccount = account,
    activeContract = contract,
    options = {}
  ) {
    const { showLoader = true } = options;

    if (showLoader) {
      setIsFeedLoading(true);
    }

    try {
      const cachedTweets = await fetchTweetsFromApi();
      const nextTweets = await decorateTweetsWithLikeState(
        activeContract,
        cachedTweets,
        activeAccount
      );

      startTransition(() => setTweets(nextTweets));
    } catch (error) {
      setErrorMessage(getReadableError(error));
    } finally {
      if (showLoader) {
        setIsFeedLoading(false);
      }
    }
  }

  async function syncConnection(shouldRequestWallet = false) {
    setErrorMessage("");

    try {
      // On first load we read an existing session silently, then explicitly
      // request account access only when the user presses Connect Wallet.
      const session = shouldRequestWallet
        ? await connectWallet()
        : await getExistingConnection();

      setWalletInstalled(session.walletInstalled);
      setAccount(session.account);
      setContract(session.contract);

      if (!session.walletInstalled) {
        setStatusMessage(
          "MetaMask is not installed. The backend feed is still available in read-only mode."
        );
      } else if (!session.account) {
        setStatusMessage(DEFAULT_STATUS);
      } else if (!session.isCorrectNetwork) {
        setStatusMessage(`Switch MetaMask to ${EXPECTED_NETWORK_NAME} and reconnect.`);
      } else if (!session.contract) {
        setStatusMessage(
          session.contractError ||
            "The contract is not deployed on the selected network yet."
        );
      } else {
        setStatusMessage(`Connected to ${EXPECTED_NETWORK_NAME}.`);
      }

      await refreshTweets(session.account, session.contract, { showLoader: false });
    } catch (error) {
      const friendlyMessage = getReadableError(error);
      setErrorMessage(friendlyMessage);
      setStatusMessage("Wallet connection could not be completed.");
    } finally {
      setIsInitializing(false);
      setIsConnecting(false);
    }
  }

  async function handleConnectWallet() {
    setIsConnecting(true);
    await syncConnection(true);
  }

  async function handleCreateTweet(content) {
    if (!contract || !account) {
      throw new Error("Connect MetaMask before posting a tweet.");
    }

    setErrorMessage("");
    setIsPosting(true);

    try {
      setStatusMessage("Uploading tweet content to IPFS...");
      const { cid } = await uploadTweetMetadata(content);

      setStatusMessage("Submitting transaction to the blockchain...");
      const receipt = await createTweet(contract, account, cid);
      const createdTweetIdValue = getReceiptEventValue(receipt, "TweetCreated", "id");
      const createdTweetId =
        createdTweetIdValue === null ? null : Number(createdTweetIdValue);

      setStatusMessage("Waiting for the backend cache to index the new tweet...");

      if (createdTweetId !== null && !Number.isNaN(createdTweetId)) {
        await waitForTweetCacheSync(createdTweetId);
      }

      setStatusMessage("Tweet created successfully.");
      await refreshTweets(account, contract, { showLoader: false });
    } catch (error) {
      const friendlyMessage = getReadableError(error);
      setErrorMessage(friendlyMessage);
      setStatusMessage("Tweet creation failed.");
      throw new Error(friendlyMessage);
    } finally {
      setIsPosting(false);
    }
  }

  async function handleLikeTweet(tweet) {
    if (!contract || !account) {
      setErrorMessage("Connect MetaMask before liking a tweet.");
      return;
    }

    if (!tweet?.isCurrentDeployment) {
      setErrorMessage(
        "This tweet belongs to an older deployment archive and can no longer receive likes."
      );
      return;
    }

    setErrorMessage("");
    setLikeLoadingId(tweet.cacheKey);

    try {
      const existingTweet = tweets.find(
        (currentTweet) => currentTweet.cacheKey === tweet.cacheKey
      );
      const receipt = await likeTweet(contract, account, tweet.id);
      const expectedLikesValue = getReceiptEventValue(receipt, "TweetLiked", "likes");
      const receiptLikes =
        expectedLikesValue === null ? null : Number(expectedLikesValue);
      const expectedLikes = Number.isNaN(receiptLikes)
        ? (existingTweet?.likes || 0) + 1
        : receiptLikes;

      startTransition(() => {
        setTweets((currentTweets) =>
          currentTweets.map((currentTweet) =>
            currentTweet.cacheKey === tweet.cacheKey
              ? {
                  ...currentTweet,
                  likes: Math.max(currentTweet.likes, expectedLikes),
                  hasLiked: true
                }
              : currentTweet
          )
        );
      });

      setStatusMessage("Waiting for the backend cache to catch up with the new like...");
      await waitForTweetCacheSync(tweet.id, {
        expectedLikes
      });

      setStatusMessage("Tweet liked successfully.");
      await refreshTweets(account, contract, { showLoader: false });
    } catch (error) {
      setErrorMessage(getReadableError(error));
    } finally {
      setLikeLoadingId("");
    }
  }

  useEffect(() => {
    syncConnection(false);
  }, []);

  useEffect(() => {
    const ethereum = window.ethereum;

    if (!ethereum) {
      return undefined;
    }

    const handleAccountsChanged = () => window.location.reload();
    const handleChainChanged = () => window.location.reload();

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      refreshTweets(account, contract, { showLoader: false }).catch(() => {});
    }, TWEET_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [account, contract]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.15),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_100%)] text-slate-900">
      <Navbar
        account={account}
        isConnecting={isConnecting}
        onConnectWallet={handleConnectWallet}
        walletInstalled={walletInstalled}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-panel backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">
                Web3 Social Feed
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-950">
                Decentralized Twitter on Ethereum
              </h1>
            </div>
            <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              {account ? "Wallet connected" : "Wallet not connected"}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {statusMessage}
            </div>
            <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
              Ethereum remains the source of truth while the backend + MongoDB cache
              keeps the global feed and like counts synchronized for every user.
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}
        </section>

        <Routes>
          <Route
            path="/"
            element={
              <Home
                isContractReady={Boolean(contract)}
                isLoading={isInitializing || isFeedLoading}
                isWalletConnected={Boolean(account)}
                likeLoadingId={likeLoadingId}
                onLikeTweet={handleLikeTweet}
                onRefresh={() => refreshTweets(account, contract)}
                tweets={tweets}
                walletInstalled={walletInstalled}
              />
            }
          />
          <Route
            path="/create"
            element={
              <CreateTweet
                isContractReady={Boolean(contract)}
                isSubmitting={isPosting}
                isWalletConnected={Boolean(account)}
                onCreateTweet={handleCreateTweet}
                walletInstalled={walletInstalled}
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
