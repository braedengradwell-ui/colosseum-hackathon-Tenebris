import { ethers } from "hardhat";

async function main() {
  console.log("Deploying IOUSoulbound contract...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const IOUSoulbound = await ethers.getContractFactory("IOUSoulbound");
  
  const name = "Scotopia IOUs";
  const symbol = "SIOU";
  const baseURI = "https://scotopia.io/api/attestations/";
  
  const contract = await IOUSoulbound.deploy(
    deployer.address, // initialOwner
    name,
    symbol,
    baseURI
  );

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("IOUSoulbound deployed to:", address);
  console.log("\nContract details:");
  console.log("- Name:", name);
  console.log("- Symbol:", symbol);
  console.log("- Owner:", deployer.address);
  console.log("\nAdd this to your .env file:");
  console.log(`ETH_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

