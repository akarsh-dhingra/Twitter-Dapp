import { useState } from "react";
import { useNavigate } from "react-router-dom";

const MAX_TWEET_LENGTH = 280;

function CreateTweet({
  isContractReady,
  isSubmitting,
  isWalletConnected,
  onCreateTweet,
  walletInstalled
}) {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [localError, setLocalError] = useState("");

  const remainingCharacters = MAX_TWEET_LENGTH - content.length;

  async function handleSubmit(event) {
    event.preventDefault();
    setLocalError("");

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setLocalError("Tweet content cannot be empty.");
      return;
    }

    if (!walletInstalled) {
      setLocalError("Install MetaMask before creating a tweet.");
      return;
    }

    if (!isWalletConnected) {
      setLocalError("Connect MetaMask before creating a tweet.");
      return;
    }

    if (!isContractReady) {
      setLocalError("Deploy the Twitter contract before creating a tweet.");
      return;
    }

    try {
      await onCreateTweet(trimmedContent);
      setContent("");
      navigate("/");
    } catch (error) {
      setLocalError(error.message || "Tweet creation failed.");
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">
          Create Tweet
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          Publish a message to IPFS and Ethereum
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          The app uploads your tweet text to IPFS as JSON, then stores the CID on-chain
          using the `Twitter.sol` contract.
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Tweet content
            </span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value.slice(0, MAX_TWEET_LENGTH))}
              rows={6}
              placeholder="Share your Web3 thought..."
              className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
            />
          </label>

          <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div>
              Remaining characters:{" "}
              <span className="font-semibold text-slate-900">{remainingCharacters}</span>
            </div>
            <div>JSON is pinned to IPFS before the blockchain transaction is sent.</div>
          </div>

          {localError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {localError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Publishing..." : "Publish Tweet"}
            </button>
            <p className="text-sm text-slate-500">
              Tip: deploy locally first, then move to Sepolia for testing with MetaMask.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}

export default CreateTweet;
