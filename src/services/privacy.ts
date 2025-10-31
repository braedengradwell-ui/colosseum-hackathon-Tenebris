import { Config, PrivacyTier } from '../config/loadConfig.js';

export interface TierAssignment {
  tier: string;
  amount: number;
  originalAmount: number;
}

export function getPrivacyTier(amount: number, tiers: PrivacyTier[]): TierAssignment {
  // Sort tiers by threshold descending
  const sortedTiers = [...tiers].sort((a, b) => b.threshold - a.threshold);
  
  for (const tier of sortedTiers) {
    if (amount >= tier.threshold) {
      return {
        tier: tier.name,
        amount: tier.threshold,
        originalAmount: amount,
      };
    }
  }
  
  return {
    tier: 'No Tier',
    amount: 0,
    originalAmount: amount,
  };
}

export function anonymizeAmount(amount: number, tiers: PrivacyTier[]): number {
  const { amount: tierAmount } = getPrivacyTier(amount, tiers);
  return tierAmount;
}

