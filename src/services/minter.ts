import { Config } from '../config/loadConfig.js';
import { Deposit } from '../db/schema.js';
import { logger } from './logger.js';
import { ethers } from 'ethers';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export interface MintResult {
  success: boolean;
  attestationId?: string;
  tokenId?: string;
  error?: string;
}

export class MinterService {
  private config: Config;
  private db: Database.Database;
  private ethereumSigner?: ethers.Wallet;
  private ethereumContract?: ethers.Contract;

  constructor(config: Config, db: Database.Database) {
    this.config = config;
    this.db = db;
  }

  async initialize(): Promise<void> {
    if (this.config.mode === 'ethereum') {
      await this.initializeEthereum();
    }
  }

  private async initializeEthereum(): Promise<void> {
    if (!this.config.ethereum.rpcUrl || !this.config.ethereum.contractAddress) {
      throw new Error('Ethereum configuration incomplete');
    }

    const provider = new ethers.JsonRpcProvider(this.config.ethereum.rpcUrl);
    this.ethereumSigner = new ethers.Wallet(
      process.env.ETH_PRIVATE_KEY || '',
      provider
    );

    const contractABI = [
      "function mintAttestation(address to, string memory metadataUri) external returns (uint256)",
      "function mintTier(address to, uint256 tierId) external returns (uint256)",
    ];

    this.ethereumContract = new ethers.Contract(
      this.config.ethereum.contractAddress,
      contractABI,
      this.ethereumSigner
    );

    logger.info('Ethereum minter initialized', { 
      address: this.ethereumSigner.address,
      contract: this.config.ethereum.contractAddress 
    });
  }

  async mintAttestation(
    deposit: Deposit,
    tier: string,
    metadataUri?: string
  ): Promise<MintResult> {
    try {
      // Check if already processed
      if (deposit.processed) {
        return {
          success: false,
          error: 'Deposit already processed',
        };
      }

      let tokenId: string;
      let txHash: string | null = null;

      if (this.config.mode === 'ethereum') {
        const result = await this.mintOnEthereum(deposit.wallet, tier, metadataUri);
        tokenId = result.tokenId;
        txHash = result.txHash;
      } else if (this.config.mode === 'solana') {
        tokenId = await this.mintOnSolana(deposit.wallet, tier);
      } else {
        // Mock mode
        tokenId = await this.mintMock(deposit.wallet, tier);
      }

      // Create attestation record
      const attestationId = uuidv4();
      const metadata = JSON.stringify({
        depositId: deposit.id,
        tier,
        timestamp: Date.now(),
        metadataUri,
      });

      this.db.prepare(`
        INSERT INTO attestations (id, deposit_id, wallet, tier, token_id, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(attestationId, deposit.id, deposit.wallet, tier, tokenId, metadata);

      // Mark deposit as processed
      this.db.prepare(`
        UPDATE deposits SET processed = 1 WHERE id = ?
      `).run(deposit.id);

      logger.info('Attestation minted successfully', {
        attestationId,
        wallet: deposit.wallet,
        tier,
        tokenId,
        txHash,
      });

      return {
        success: true,
        attestationId,
        tokenId,
      };
    } catch (error) {
      logger.error('Failed to mint attestation', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async mintOnEthereum(
    wallet: string,
    tier: string,
    metadataUri?: string
  ): Promise<{ tokenId: string; txHash: string }> {
    if (!this.ethereumContract) {
      throw new Error('Ethereum contract not initialized');
    }

    const uri = metadataUri || `https://scotopia.io/attestations/${wallet}/${tier}`;
    
    // Gas estimation
    const gasEstimate = await this.ethereumContract.mintAttestation.estimateGas(wallet, uri);
    logger.info('Gas estimate', { gas: gasEstimate.toString() });

    // Send transaction
    const tx = await this.ethereumContract.mintAttestation(wallet, uri, {
      gasLimit: gasEstimate + BigInt(10000), // Add buffer
    });

    logger.info('Transaction sent', { txHash: tx.hash });
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    // Parse token ID from events or receipt
    const tokenId = receipt.logs.length > 0 ? receipt.logs[0].topics[3] : Date.now().toString();

    return {
      tokenId: tokenId.toString(),
      txHash: receipt.hash,
    };
  }

  private async mintOnSolana(wallet: string, tier: string): Promise<string> {
    // Mock Solana minting - returns a pseudo token ID
    logger.info('Mock Solana mint', { wallet, tier });
    return `sol-mock-${Date.now()}`;
  }

  private async mintMock(wallet: string, tier: string): Promise<string> {
    // Mock minting - returns a pseudo token ID
    logger.info('Mock mint', { wallet, tier });
    return `mock-${Date.now()}`;
  }

  getAttestations(wallet: string): any[] {
    return this.db.prepare(`
      SELECT * FROM attestations WHERE wallet = ?
    `).all(wallet);
  }

  getAttestationById(attestationId: string): any {
    return this.db.prepare(`
      SELECT * FROM attestations WHERE id = ?
    `).get(attestationId);
  }
}

