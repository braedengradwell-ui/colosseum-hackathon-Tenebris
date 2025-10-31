import { Deposit } from '../db/schema.js';
import { logger } from './logger.js';

export interface VerificationResult {
  valid: boolean;
  reason?: string;
}

const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_EVENTS_PER_WINDOW = 10;

interface RateLimitEntry {
  wallet: string;
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function cleanupOldEntries() {
  const now = Date.now();
  for (const [wallet, entry] of rateLimitMap.entries()) {
    entry.timestamps = entry.timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    if (entry.timestamps.length === 0) {
      rateLimitMap.delete(wallet);
    }
  }
}

export function verifyDeposit(deposit: Deposit): VerificationResult {
  // Amount validation
  if (deposit.amount <= 0) {
    logger.warn(`Invalid deposit amount: ${deposit.amount}`, { depositId: deposit.id });
    return { valid: false, reason: 'Amount must be greater than 0' };
  }

  // Timestamp validation (must be within last 24 hours)
  const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
  if (deposit.timestamp < twentyFourHoursAgo) {
    logger.warn(`Deposit timestamp too old: ${deposit.timestamp}`, { depositId: deposit.id });
    return { valid: false, reason: 'Deposit timestamp too old' };
  }

  // Future timestamp check
  if (deposit.timestamp > Date.now() + 60000) {
    logger.warn(`Deposit timestamp in future: ${deposit.timestamp}`, { depositId: deposit.id });
    return { valid: false, reason: 'Deposit timestamp in future' };
  }

  // Wallet address validation
  if (!deposit.wallet || deposit.wallet.length < 20) {
    logger.warn(`Invalid wallet address: ${deposit.wallet}`, { depositId: deposit.id });
    return { valid: false, reason: 'Invalid wallet address' };
  }

  // Rate limiting
  cleanupOldEntries();
  const entry = rateLimitMap.get(deposit.wallet) || { wallet: deposit.wallet, timestamps: [] };
  
  if (entry.timestamps.length >= MAX_EVENTS_PER_WINDOW) {
    logger.warn(`Rate limit exceeded for wallet: ${deposit.wallet}`, { depositId: deposit.id });
    return { valid: false, reason: 'Rate limit exceeded' };
  }

  entry.timestamps.push(Date.now());
  rateLimitMap.set(deposit.wallet, entry);

  return { valid: true };
}

export function checkDuplicate(deposit: Deposit, existingDeposits: Deposit[]): boolean {
  return existingDeposits.some(d => d.txid === deposit.txid || d.id === deposit.id);
}

