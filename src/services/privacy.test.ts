import { describe, it, expect } from 'vitest';
import { getPrivacyTier } from './privacy.js';
import { PrivacyTier } from '../config/loadConfig.js';

describe('Privacy', () => {
  const tiers: PrivacyTier[] = [
    { name: 'Tier A', threshold: 100 },
    { name: 'Tier B', threshold: 10 },
    { name: 'Tier C', threshold: 1 },
  ];

  describe('getPrivacyTier', () => {
    it('should assign Tier A for amounts >= 100', () => {
      const result = getPrivacyTier(150, tiers);
      expect(result.tier).toBe('Tier A');
    });

    it('should assign Tier B for amounts >= 10', () => {
      const result = getPrivacyTier(25, tiers);
      expect(result.tier).toBe('Tier B');
    });

    it('should assign Tier C for amounts >= 1', () => {
      const result = getPrivacyTier(5, tiers);
      expect(result.tier).toBe('Tier C');
    });

    it('should assign No Tier for amounts < 1', () => {
      const result = getPrivacyTier(0.5, tiers);
      expect(result.tier).toBe('No Tier');
    });
  });
});

