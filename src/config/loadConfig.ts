import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

interface EthereumConfig {
  rpcUrl: string;
  contractAddress: string;
  chainId: number;
}

interface SolanaConfig {
  rpcUrl: string;
  programId: string;
}

interface PrivacyTier {
  name: string;
  threshold: number;
}

interface SecurityConfig {
  adminApiKey: string;
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

interface Config {
  mode: 'mock' | 'ethereum' | 'solana';
  port: number;
  ethereum: EthereumConfig;
  solana: SolanaConfig;
  security: SecurityConfig;
  database: {
    path: string;
  };
  privacy: {
    tiers: PrivacyTier[];
  };
  mock: {
    eventIntervalMin: number;
    eventIntervalMax: number;
  };
}

export function loadConfig(): Config {
  const configPath = join(__dirname, '../../config/default.json');
  const defaultConfig = JSON.parse(readFileSync(configPath, 'utf-8')) as Config;

  return {
    mode: (process.env.MODE as Config['mode']) || defaultConfig.mode,
    port: parseInt(process.env.PORT || String(defaultConfig.port)),
    ethereum: {
      rpcUrl: process.env.ETH_RPC_URL || defaultConfig.ethereum.rpcUrl,
      contractAddress: process.env.ETH_CONTRACT_ADDRESS || defaultConfig.ethereum.contractAddress,
      chainId: defaultConfig.ethereum.chainId,
    },
    solana: {
      rpcUrl: process.env.SOLANA_RPC_URL || defaultConfig.solana.rpcUrl,
      programId: process.env.HUMIDIFI_PROGRAM_ID || defaultConfig.solana.programId,
    },
    security: {
      adminApiKey: process.env.ADMIN_API_KEY || defaultConfig.security.adminApiKey || 'default-admin-key',
      rateLimit: defaultConfig.security.rateLimit,
    },
    database: {
      path: process.env.DB_PATH || defaultConfig.database.path,
    },
    privacy: defaultConfig.privacy,
    mock: defaultConfig.mock,
  };
}

export type { Config, PrivacyTier };

