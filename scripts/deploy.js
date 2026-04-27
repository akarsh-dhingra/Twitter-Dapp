const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function syncFrontendFiles(address, chainId) {
  // Keep the frontend ABI and address in sync with the latest deployment.
  const frontendContractsDir = path.join(
    __dirname,
    "..",
    "client",
    "src",
    "contracts"
  );

  if (!fs.existsSync(frontendContractsDir)) {
    return;
  }

  fs.mkdirSync(frontendContractsDir, { recursive: true });

  const artifact = await hre.artifacts.readArtifact("Twitter");
  const artifactPath = path.join(frontendContractsDir, "Twitter.json");
  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));

  const addressPath = path.join(frontendContractsDir, "contract-address.json");
  let existingAddresses = {};

  if (fs.existsSync(addressPath)) {
    existingAddresses = JSON.parse(fs.readFileSync(addressPath, "utf8"));
  }

  existingAddresses[String(chainId)] = address;
  fs.writeFileSync(addressPath, JSON.stringify(existingAddresses, null, 2));
}

function syncBackendEnv(address, deploymentId) {
  const backendEnvPath = path.join(__dirname, "..", "backend", ".env");

  if (!fs.existsSync(backendEnvPath)) {
    return;
  }

  let nextEnv = fs.readFileSync(backendEnvPath, "utf8");
  const entries = {
    CONTRACT_ADDRESS: address,
    CONTRACT_DEPLOYMENT_ID: deploymentId
  };

  for (const [key, value] of Object.entries(entries)) {
    const nextEntry = `${key}=${value}`;

    if (new RegExp(`^${key}=.*$`, "m").test(nextEnv)) {
      nextEnv = nextEnv.replace(new RegExp(`^${key}=.*$`, "m"), nextEntry);
    } else {
      const separator = nextEnv.endsWith("\n") ? "" : "\n";
      nextEnv = `${nextEnv}${separator}${nextEntry}\n`;
    }
  }

  fs.writeFileSync(backendEnvPath, nextEnv);
}

async function main() {
  const twitterFactory = await hre.ethers.getContractFactory("Twitter");
  const twitter = await twitterFactory.deploy();
  await twitter.waitForDeployment();

  const contractAddress = await twitter.getAddress();
  const network = await hre.ethers.provider.getNetwork();
  const deploymentId = `${hre.network.name}-${network.chainId}-${Date.now()}`;

  await syncFrontendFiles(contractAddress, network.chainId);
  syncBackendEnv(contractAddress, deploymentId);

  console.log("Twitter deployed successfully");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Chain ID: ${network.chainId}`);
  console.log(`Contract address: ${contractAddress}`);
  console.log(`Deployment ID: ${deploymentId}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
