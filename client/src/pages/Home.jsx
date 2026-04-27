import TweetCard from "../components/TweetCard";

function Home({
  isContractReady,
  isLoading,
  isWalletConnected,
  likeLoadingId,
  onLikeTweet,
  onRefresh,
  tweets,
  walletInstalled
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Feed</h2>
            <p className="mt-1 text-sm text-slate-500">
              Read the durable MongoDB archive and like tweets from the active deployment through your wallet.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            Loading tweets from the backend cache and IPFS...
          </div>
        ) : tweets.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">No tweets yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Create the first on-chain tweet to populate the permanent archive.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tweets.map((tweet) => (
              <TweetCard
                key={tweet.cacheKey}
                tweet={tweet}
                isWalletConnected={isWalletConnected}
                isLikeLoading={likeLoadingId === tweet.cacheKey}
                onLikeTweet={onLikeTweet}
              />
            ))}
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">
            Wallet Status
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">
            Ready to publish?
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            {walletInstalled
              ? isWalletConnected
                ? "Your wallet is connected. You can post tweets and like content."
                : "Connect your MetaMask wallet to post and like tweets."
              : "Install MetaMask first to interact with the dApp."}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">
            How It Works
          </p>
          <ul className="mt-3 space-y-3 text-sm text-slate-600">
            <li>Tweet text is uploaded to IPFS as JSON.</li>
            <li>The CID and likes remain on-chain inside the Twitter contract.</li>
            <li>MongoDB keeps a durable archive so tweets still appear after backend restarts and local redeploys.</li>
          </ul>
        </div>

        {!isContractReady ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-sm font-medium text-amber-900">
              You can read cached tweets, but you need a deployed contract on the
              selected network to post or like.
            </p>
          </div>
        ) : null}
      </aside>
    </section>
  );
}

export default Home;
