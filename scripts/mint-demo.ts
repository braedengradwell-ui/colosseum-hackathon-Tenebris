import dotenv from 'dotenv';
import { loadConfig } from '../src/config/loadConfig.js';
import Database from 'better-sqlite3';
import { initializeDatabase } from '../src/db/schema.js';
import { MinterService } from '../src/services/minter.js';
import { getPrivacyTier } from '../src/services/privacy.js';

dotenv.config();

async function main() {
  const config = loadConfig();
  const db = initializeDatabase(config.database.path);
  const minter = new MinterService(config, db);

  await minter.initialize();

  console.log('Scotopia Mint Demo');
  console.log('Mode:', config.mode);
  console.log('');

  const demoDeposits = [
    {
      id: 'demo-1',
      txid: '0x1111111111111111111111111111111111111111111111111111111111111111',
      wallet: '0x3FfC1234567890abcdef1234567890ABCDEFABCD',
      amount: 12.5,
      token: 'USDC',
      timestamp: Date.now(),
      processed: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'demo-2',
      txid: '0x2222222222222222222222222222222222222222222222222222222222222222',
      wallet: '0x4A8b567890ABCDEFabcdef1234567890abcdef1234',
      amount: 150.0,
      token: 'USDC',
      timestamp: Date.now(),
      processed: false,
      created_at: new Date().toISOString(),
    },
  ];

  for (const deposit of demoDeposits) {
    const tier = getPrivacyTier(deposit.amount, config.privacy.tiers);
    console.log(`Minting attestation for ${deposit.wallet} (${tier.tier})...`);

    const result = await minter.mintAttestation(deposit, tier.tier);

    if (result.success) {
      console.log(`✅ Minted successfully!`);
      console.log(`   Attestation ID: ${result.attestationId}`);
      console.log(`   Token ID: ${result.tokenId}`);
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
    console.log('');
  }

  console.log('Demo complete!');
  db.close();
}

main().catch(console.error);

