import { EventEmitter } from 'events';
import { Config } from '../config/loadConfig.js';
import { logger } from '../services/logger.js';
import { ethers } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';

export interface DepositEvent {
  id: string;
  txid: string;
  wallet: string;
  amount: number;
  token: string;
  timestamp: number;
}

export class HumidifiListener extends EventEmitter {
  private config: Config;
  private mockInterval?: NodeJS.Timeout;
  private ethereumListener?: ethers.Contract;

  constructor(config: Config) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    logger.info(`Starting Humidifi listener in ${this.config.mode} mode`);

    switch (this.config.mode) {
      case 'mock':
        this.startMockMode();
        break;
      case 'ethereum':
        await this.startEthereumMode();
        break;
      case 'solana':
        await this.startSolanaMode();
        break;
      default:
        throw new Error(`Unknown mode: ${this.config.mode}`);
    }
  }

  private startMockMode(): void {
    logger.info('Starting mock deposit event generator');
    
    const sampleDeposits: DepositEvent[] = [
      {
        id: 'mock-1',
        txid: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        wallet: '0x3FfC1234567890abcdef1234567890ABCDEFABCD',
        amount: 12.5,
        token: 'USDC',
        timestamp: Date.now() - 10000,
      },
      {
        id: 'mock-2',
        txid: '0xdef01234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
        wallet: '0x4A8b567890ABCDEFabcdef1234567890abcdef1234',
        amount: 150.0,
        token: 'USDC',
        timestamp: Date.now() - 5000,
      },
      {
        id: 'mock-3',
        txid: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
        wallet: '0x5C9c1234567890ABCDEFabcdef1234567890abcdef',
        amount: 5.75,
        token: 'USDC',
        timestamp: Date.now(),
      },
      {
        id: 'mock-4',
        txid: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        wallet: '0x6D0dABCDEFabcdef1234567890abcdef1234567890',
        amount: 250.5,
        token: 'USDC',
        timestamp: Date.now(),
      },
      {
        id: 'mock-5',
        txid: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        wallet: '0x7E1eabcdef1234567890ABCDEFabcdef12345678',
        amount: 1.25,
        token: 'USDC',
        timestamp: Date.now(),
      },
    ];

    let index = 0;
    const emitNextDeposit = () => {
      if (index >= sampleDeposits.length) {
        index = 0; // Loop back
      }

      const deposit = sampleDeposits[index++];
      this.emit('deposit', deposit);
      logger.info('Mock deposit event emitted', { depositId: deposit.id, wallet: deposit.wallet });

      const interval = this.config.mock.eventIntervalMin + 
                      Math.random() * (this.config.mock.eventIntervalMax - this.config.mock.eventIntervalMin);
      
      this.mockInterval = setTimeout(emitNextDeposit, interval);
    };

    // Start immediately
    emitNextDeposit();
  }

  private async startEthereumMode(): Promise<void> {
    if (!this.config.ethereum.rpcUrl || !this.config.ethereum.contractAddress) {
      throw new Error('Ethereum RPC URL and contract address must be configured');
    }

    try {
      const provider = new ethers.JsonRpcProvider(this.config.ethereum.rpcUrl);
      
      // Example contract ABI - includes Deposit event
      const contractABI = [
        "event Deposit(address indexed user, uint256 amount, string token, uint256 timestamp)",
        "function mintAttestation(address to, string memory metadataUri) external"
      ];

      this.ethereumListener = new ethers.Contract(
        this.config.ethereum.contractAddress,
        contractABI,
        provider
      );

      this.ethereumListener.on('Deposit', (user: string, amount: bigint, token: string, timestamp: bigint) => {
        const deposit: DepositEvent = {
          id: `eth-${Date.now()}`,
          txid: `0x${Math.random().toString(16).substring(2)}`, // Mock txid
          wallet: user,
          amount: Number(ethers.formatEther(amount)),
          token: token,
          timestamp: Number(timestamp) * 1000, // Convert to milliseconds
        };

        this.emit('deposit', deposit);
        logger.info('Ethereum deposit event received', { wallet: user, amount: deposit.amount });
      });

      logger.info('Ethereum listener started', { contract: this.config.ethereum.contractAddress });
    } catch (error) {
      logger.error('Failed to start Ethereum listener', error);
      throw error;
    }
  }

  private async startSolanaMode(): Promise<void> {
    if (!this.config.solana.rpcUrl) {
      throw new Error('Solana RPC URL must be configured');
    }

    try {
      const connection = new Connection(this.config.solana.rpcUrl, 'confirmed');
      
      if (this.config.solana.programId) {
        const programId = new PublicKey(this.config.solana.programId);
        
        connection.onProgramAccountChange(
          programId,
          (accountInfo, context) => {
            // Parse account data to extract deposit info
            // This is a mock implementation - replace with actual parsing logic
            const deposit: DepositEvent = {
              id: `sol-${Date.now()}`,
              txid: accountInfo.account.owner.toString(),
              wallet: accountInfo.account.owner.toString(), // Mock
              amount: 10.0, // Mock
              token: 'USDC',
              timestamp: Date.now(),
            };

            this.emit('deposit', deposit);
            logger.info('Solana deposit event received', { wallet: deposit.wallet });
          },
          'confirmed'
        );

        logger.info('Solana listener started', { programId: this.config.solana.programId });
      } else {
        // Polling mode if no program ID
        this.startSolanaPolling(connection);
      }
    } catch (error) {
      logger.error('Failed to start Solana listener', error);
      throw error;
    }
  }

  private startSolanaPolling(connection: Connection): void {
    setInterval(async () => {
      try {
        const recentBlockhashes = await connection.getRecentBlockhashes();
        // Mock parsing - replace with actual transaction parsing
        logger.debug('Polling Solana network', { blockhashes: recentBlockhashes.length });
      } catch (error) {
        logger.error('Error polling Solana', error);
      }
    }, 10000);
  }

  async stop(): Promise<void> {
    if (this.mockInterval) {
      clearTimeout(this.mockInterval);
    }

    if (this.ethereumListener) {
      this.ethereumListener.removeAllListeners();
    }

    this.removeAllListeners();
    logger.info('Humidifi listener stopped');
  }
}

