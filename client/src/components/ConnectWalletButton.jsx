import { shortenAddress } from "../utils/formatters";

function ConnectWalletButton({
  account,
  isConnecting,
  onConnectWallet,
  walletInstalled
}) {
  if (!walletInstalled) {
    return (
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
      >
        Install MetaMask
      </a>
    );
  }

  if (account) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        {shortenAddress(account)}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onConnectWallet}
      disabled={isConnecting}
      className="inline-flex items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}

export default ConnectWalletButton;
