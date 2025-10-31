import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Deposit {
  id: string;
  txid: string;
  wallet: string;
  amount: number;
  token: string;
  timestamp: number;
  processed: boolean;
  created_at: string;
}

export interface Attestation {
  id: string;
  deposit_id: string;
  wallet: string;
  tier: string;
  token_id: string | null;
  minted_at: string;
  metadata: string;
}

export function initializeDatabase(dbPath: string): Database.Database {
  // Ensure directory exists
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS deposits (
      id TEXT PRIMARY KEY,
      txid TEXT NOT NULL,
      wallet TEXT NOT NULL,
      amount REAL NOT NULL,
      token TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      processed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attestations (
      id TEXT PRIMARY KEY,
      deposit_id TEXT NOT NULL,
      wallet TEXT NOT NULL,
      tier TEXT NOT NULL,
      token_id TEXT,
      minted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT,
      FOREIGN KEY (deposit_id) REFERENCES deposits(id)
    );

    CREATE INDEX IF NOT EXISTS idx_deposits_wallet ON deposits(wallet);
    CREATE INDEX IF NOT EXISTS idx_deposits_processed ON deposits(processed);
    CREATE INDEX IF NOT EXISTS idx_attestations_wallet ON attestations(wallet);
  `);

  return db;
}

