import { NavLink } from "react-router-dom";
import ConnectWalletButton from "./ConnectWalletButton";

function Navbar({ account, isConnecting, onConnectWallet, walletInstalled }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-white/75 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">
            Twitter dApp
          </p>
          <h2 className="text-lg font-semibold text-slate-950">
            On-chain posts with IPFS-backed content
          </h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <nav className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/create"
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`
              }
            >
              Create Tweet
            </NavLink>
          </nav>

          <ConnectWalletButton
            account={account}
            isConnecting={isConnecting}
            onConnectWallet={onConnectWallet}
            walletInstalled={walletInstalled}
          />
        </div>
      </div>
    </header>
  );
}

export default Navbar;
