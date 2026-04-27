import Web3 from "web3";
import TwitterArtifact from "../contracts/Twitter.json";
import contractAddresses from "../contracts/contract-address.json";

export const EXPECTED_CHAIN_ID = Number(
  import.meta.env.VITE_SEPOLIA_CHAIN_ID || 11155111
);
export const EXPECTED_NETWORK_NAME =
  import.meta.env.VITE_EXPECTED_NETWORK_NAME || "Sepolia";

function getEthereumProvider() {
  return typeof window !== "undefined" ? window.ethereum : null;
}

function getContractAddress(chainId) {
  return contractAddresses[String(chainId)] || "";
}

function getContractInstance(web3, chainId) {
  const contractAddress = getContractAddress(chainId);

  if (!contractAddress) {
    throw new Error(
      `Twitter contract is not deployed for chain ID ${chainId}. Run the deploy script to update client/src/contracts/contract-address.json.`
    );
  }

  return new web3.eth.Contract(TwitterArtifact.abi, contractAddress);
}

async function buildConnectionState({ requestAccounts = false } = {}) {
  const provider = getEthereumProvider();

  if (!provider) {
    return {
      walletInstalled: false,
      web3: null,
      account: "",
      chainId: null,
      isCorrectNetwork: false,
      contract: null,
      contractError: ""
    };
  }

  const web3 = new Web3(provider);
  const accountMethod = requestAccounts ? "eth_requestAccounts" : "eth_accounts";

  const [accounts, chainIdHex] = await Promise.all([
    provider.request({ method: accountMethod }),
    provider.request({ method: "eth_chainId" })
  ]);

  const account = accounts?.[0] || "";
  const chainId = Number.parseInt(chainIdHex, 16);
  const isCorrectNetwork = chainId === EXPECTED_CHAIN_ID;

  let contract = null;
  let contractError = "";

  if (isCorrectNetwork) {
    try {
      contract = getContractInstance(web3, chainId);
    } catch (error) {
      contractError = error.message;
    }
  }

  return {
    walletInstalled: true,
    web3,
    account,
    chainId,
    isCorrectNetwork,
    contract,
    contractError
  };
}

async function switchToExpectedNetwork(provider = getEthereumProvider()) {
  if (!provider) {
    throw new Error("MetaMask is not installed.");
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: Web3.utils.numberToHex(EXPECTED_CHAIN_ID) }]
    });
  } catch (error) {
    if (error.code === 4902) {
      throw new Error(
        `${EXPECTED_NETWORK_NAME} is not available in MetaMask. Add the network and try again.`
      );
    }

    throw error;
  }
}

export async function getExistingConnection() {
  return buildConnectionState();
}

export async function connectWallet() {
  const provider = getEthereumProvider();

  if (!provider) {
    throw new Error("MetaMask is not installed. Please install it to continue.");
  }

  let state = await buildConnectionState({ requestAccounts: true });

  if (!state.isCorrectNetwork) {
    await switchToExpectedNetwork(provider);
    state = await buildConnectionState();
  }

  return state;
}

export async function createTweet(contract, account, ipfsHash) {
  return contract.methods.createTweet(ipfsHash).send({ from: account });
}

export async function likeTweet(contract, account, tweetId) {
  return contract.methods.likeTweet(tweetId).send({ from: account });
}

export function getReceiptEventValue(receipt, eventName, valueName) {
  const eventEntry = receipt?.events?.[eventName];

  if (Array.isArray(eventEntry) && eventEntry[0]?.returnValues?.[valueName] !== undefined) {
    return eventEntry[0].returnValues[valueName];
  }

  if (eventEntry?.returnValues?.[valueName] !== undefined) {
    return eventEntry.returnValues[valueName];
  }

  return null;
}

export async function decorateTweetsWithLikeState(contract, tweets, account = "") {
  if (!contract || !account) {
    return tweets.map((tweet) => ({
      ...tweet,
      hasLiked: false
    }));
  }

  return Promise.all(
    tweets.map(async (tweet) => {
      if (!tweet.isCurrentDeployment) {
        return {
          ...tweet,
          hasLiked: false
        };
      }

      try {
        const hasLiked = await contract.methods.hasLiked(tweet.id, account).call();

        return {
          ...tweet,
          hasLiked: Boolean(hasLiked)
        };
      } catch (error) {
        console.error("Failed to read like status for tweet", tweet.id, error);

        return {
          ...tweet,
          hasLiked: false
        };
      }
    })
  );
}

export function getReadableError(error) {
  const message =
    error?.cause?.message ||
    error?.data?.message ||
    error?.message ||
    "Something went wrong while interacting with the blockchain.";

  if (message.includes("AlreadyLiked")) {
    return "You have already liked this tweet.";
  }

  if (message.includes("InvalidTweetId")) {
    return "The selected tweet could not be found.";
  }

  if (message.includes("EmptyIpfsHash")) {
    return "The IPFS hash is empty, so the tweet could not be saved.";
  }

  if (message.includes("User denied") || message.includes("user rejected")) {
    return "The request was rejected in MetaMask.";
  }

  if (message.includes("not deployed for chain ID")) {
    return message;
  }

  return message.replace(/^Error:\s*/i, "").trim();
}
