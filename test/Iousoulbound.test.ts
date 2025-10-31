import { expect } from "chai";
import { ethers } from "hardhat";

describe("IOUSoulbound", function () {
  let contract: any;
  let owner: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const IOUSoulbound = await ethers.getContractFactory("IOUSoulbound");
    contract = await IOUSoulbound.deploy(
      owner.address,
      "Scotopia IOUs",
      "SIOU",
      "https://scotopia.io/api/attestations/"
    );

    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await contract.name()).to.equal("Scotopia IOUs");
      expect(await contract.symbol()).to.equal("SIOU");
    });

    it("Should set the right owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint attestations", async function () {
      await expect(contract.mintAttestation(user1.address, "https://example.com/metadata"))
        .to.emit(contract, "AttestationMinted")
        .withArgs(user1.address, 0, "https://example.com/metadata", "");
    });

    it("Should not allow non-owner to mint", async function () {
      await expect(
        contract.connect(user1).mintAttestation(user1.address, "https://example.com/metadata")
      ).to.be.reverted;
    });

    it("Should assign unique token IDs", async function () {
      await contract.mintAttestation(user1.address, "https://example.com/metadata1");
      await contract.mintAttestation(user1.address, "https://example.com/metadata2");
      await contract.mintAttestation(user2.address, "https://example.com/metadata3");

      expect(await contract.tokenURI(0)).to.equal("https://example.com/metadata1");
      expect(await contract.tokenURI(1)).to.equal("https://example.com/metadata2");
      expect(await contract.tokenURI(2)).to.equal("https://example.com/metadata3");
    });
  });

  describe("Soulbound behavior", function () {
    it("Should not allow transfers", async function () {
      await contract.mintAttestation(user1.address, "https://example.com/metadata");
      await expect(
        contract.connect(user1).transferFrom(user1.address, user2.address, 0)
      ).to.be.revertedWithCustomError(contract, "ERC721InsufficientApproval");
    });

    it("Should not allow approvals", async function () {
      await contract.mintAttestation(user1.address, "https://example.com/metadata");
      await expect(
        contract.connect(user1).approve(user2.address, 0)
      ).to.be.reverted;
    });
  });

  describe("Tier minting", function () {
    it("Should mint with correct tier", async function () {
      await expect(contract.mintTier(user1.address, 0))
        .to.emit(contract, "AttestationMinted")
        .withArgs(user1.address, 0, "https://scotopia.io/api/attestations/Tier A", "Tier A");
    });

    it("Should reject invalid tier IDs", async function () {
      await expect(contract.mintTier(user1.address, 10))
        .to.be.revertedWith("Invalid tier ID");
    });
  });

  describe("Query functions", function () {
    it("Should return correct total supply", async function () {
      expect(await contract.totalSupply()).to.equal(0);
      await contract.mintAttestation(user1.address, "https://example.com/metadata");
      expect(await contract.totalSupply()).to.equal(1);
    });

    it("Should return whether token exists", async function () {
      expect(await contract.exists(0)).to.equal(false);
      await contract.mintAttestation(user1.address, "https://example.com/metadata");
      expect(await contract.exists(0)).to.equal(true);
    });
  });
});

