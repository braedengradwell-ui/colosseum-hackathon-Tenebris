import { describe, it, expect } from 'vitest';
import { verifyDeposit, checkDuplicate } from './verifier.js';
import { Deposit } from '../db/schema.js';

describe('Verifier', () => {
  describe('verifyDeposit', () => {
    it('should validate a valid deposit', () => {
      const deposit: Deposit = {
        id: 'test-1',
        txid: '0x123',
        wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        amount: 10.5,
        token: 'USDC',
        timestamp: Date.now(),
        processed: false,
        created_at: new Date().toISOString(),
      };

      const result = verifyDeposit(deposit);
      expect(result.valid).toBe(true);
    });

    it('should reject deposits with zero amount', () => {
      const deposit: Deposit = {
        id: 'test-2',
        txid: '0x123',
        wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        amount: 0,
        token: 'USDC',
        timestamp: Date.now(),
        processed: false,
        created_at: new Date().toISOString(),
      };

      const result = verifyDeposit(deposit);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Amount');
    });

    it('should reject deposits with old timestamps', () => {
      const deposit: Deposit = {
        id: 'test-3',
        txid: '0x123',
        wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        amount: 10.5,
        token: 'USDC',
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        processed: false,
        created_at: new Date().toISOString(),
      };

      const result = verifyDeposit(deposit);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('old');
    });
  });

  describe('checkDuplicate', () => {
    it('should detect duplicate deposits by txid', () => {
      const deposit1: Deposit = {
        id: 'test-1',
        txid: '0x123',
        wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        amount: 10.5,
        token: 'USDC',
        timestamp: Date.now(),
        processed: false,
        created_at: new Date().toISOString(),
      };

      const deposit2: Deposit = {
        id: 'test-2',
        txid: '0x123', // Same txid
        wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        amount: 10.5,
        token: 'USDC',
        timestamp: Date.now(),
        processed: false,
        created_at: new Date().toISOString(),
      };

      expect(checkDuplicate(deposit1, [deposit2])).toBe(true);
    });
  });
});

