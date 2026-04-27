import { IPFS_GATEWAY_BASE } from "../utils/ipfs";
import { formatTimestamp, shortenAddress } from "../utils/formatters";

function TweetCard({ isLikeLoading, isWalletConnected, onLikeTweet, tweet }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              {shortenAddress(tweet.author)}
            </p>
            <p className="mt-1 text-xs text-slate-500" title={tweet.author}>
              {tweet.author}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              {formatTimestamp(tweet.timestamp)}
            </span>
            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
                tweet.isCurrentDeployment
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              {tweet.isCurrentDeployment ? "Active deployment" : "Archived deployment"}
            </span>
          </div>
        </div>

        <p className="whitespace-pre-wrap text-base leading-7 text-slate-700">
          {tweet.content}
        </p>

        <p className="text-xs text-slate-500">
          Source contract: {shortenAddress(tweet.contractAddress)}
        </p>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <a
            href={`${IPFS_GATEWAY_BASE}/${tweet.ipfsHash}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-700 transition hover:text-brand-900"
          >
            View JSON on IPFS
          </a>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
              Likes: {tweet.likes}
            </span>
            <button
              type="button"
              onClick={() => onLikeTweet(tweet)}
              disabled={
                !isWalletConnected ||
                tweet.hasLiked ||
                isLikeLoading ||
                !tweet.isCurrentDeployment
              }
              className="rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              {!tweet.isCurrentDeployment
                ? "Archived"
                : tweet.hasLiked
                  ? "Liked"
                  : isLikeLoading
                    ? "Liking..."
                    : "Like"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default TweetCard;
