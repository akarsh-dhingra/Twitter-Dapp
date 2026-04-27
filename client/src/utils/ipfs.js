export const IPFS_GATEWAY_BASE = (
  import.meta.env.VITE_IPFS_GATEWAY_BASE || "https://gateway.pinata.cloud/ipfs"
).replace(/\/$/, "");

const PINATA_ENDPOINT = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

function getPinataHeaders() {
  const jwt = import.meta.env.VITE_PINATA_JWT;
  const apiKey = import.meta.env.VITE_PINATA_API_KEY;
  const apiSecret = import.meta.env.VITE_PINATA_API_SECRET;

  if (jwt) {
    return {
      Authorization: `Bearer ${jwt}`
    };
  }

  if (apiKey && apiSecret) {
    return {
      pinata_api_key: apiKey,
      pinata_secret_api_key: apiSecret
    };
  }

  throw new Error(
    "Pinata credentials are missing. Add VITE_PINATA_JWT or an API key pair to client/.env."
  );
}

async function readErrorResponse(response) {
  try {
    const data = await response.json();
    return data?.error?.reason || data?.message || JSON.stringify(data);
  } catch {
    return response.statusText || "Unknown Pinata error";
  }
}

export async function uploadTweetMetadata(content) {
  // The frontend stores tweet text in IPFS JSON and persists only the returned CID on-chain.
  const payload = {
    content,
    timestamp: Date.now()
  };

  const response = await fetch(PINATA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getPinataHeaders()
    },
    body: JSON.stringify({
      pinataContent: payload,
      pinataMetadata: {
        name: `tweet-${payload.timestamp}`
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Pinata upload failed: ${await readErrorResponse(response)}`);
  }

  const data = await response.json();

  return {
    cid: data.IpfsHash,
    payload
  };
}

export async function fetchTweetMetadata(cid) {
  const response = await fetch(`${IPFS_GATEWAY_BASE}/${cid}`);

  if (!response.ok) {
    throw new Error(`Unable to read tweet metadata from IPFS for CID ${cid}`);
  }

  return response.json();
}
