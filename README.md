# Scotopia Backend

A demo backend for Scotopia that listens for HumidiFi deposit events and mints soulbound IOU tokens. Built for hackathon demonstrations with support for mock, Ethereum, and Solana modes.

## Features

- 🎭 **Three Modes**: Mock (for demos), Ethereum, and Solana
- 🎫 **Soulbound Tokens (SBT)**: Mint non-transferable attestations for deposits
- 🔒 **Privacy Tiers**: Automatically categorize deposits into tiers (A, B, C)
- 📊 **Real-time Updates**: WebSocket support for live UI updates
- ✅ **Verification**: Built-in deposit verification and duplicate detection
- 🗄️ **SQLite Database**: Fast, file-based storage for demo purposes
- 🔐 **Admin API**: Protected endpoints for administrative functions

## Quick Start

### Prerequisites

- Node.js v18 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd scotopia-backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp env.example .env
# Edit .env with your configuration (optional for mock mode)
```

4. Build and start the mock server:
```bash
npm run build
npm run start:mock
```

Or for development with hot reload (recommended):
```bash
npm run dev:mock
```

The server will start on `http://localhost:3001` and automatically emit demo deposit events every 5-10 seconds.

## Configuration

### Modes

#### Mock Mode (Default)
Perfect for demos and presentations. Automatically generates sample deposit events.

```env
MODE=mock
```

#### Ethereum Mode
Connects to Ethereum testnet and listens to deposit events.

```env
MODE=ethereum
ETH_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
ETH_PRIVATE_KEY=your_private_key
ETH_CONTRACT_ADDRESS=0x...
```

#### Solana Mode
Connects to Solana devnet and listens to program events.

```env
MODE=solana
SOLANA_RPC_URL=https://api.devnet.solana.com
HUMIDIFI_PROGRAM_ID=your_program_id
```

### Privacy Tiers

Default tiers configured in `config/default.json`:
- **Tier A**: ≥ 100 (amount)
- **Tier B**: ≥ 10 (amount)
- **Tier C**: ≥ 1 (amount)

Customize by editing `config/default.json`.

## API Endpoints

### Health Check
```bash
GET /health
```
Returns server status and mode.

### Status
```bash
GET /api/status
```
Returns statistics: deposit count, attestation count, recent events.

### Get Attestations
```bash
GET /api/attestations/:address
```
Returns all attestations for a given wallet address.

### Get Deposits
```bash
GET /api/deposits/:address
```
Returns all deposits for a given wallet address.

### Mint Attestation (Admin)
```bash
POST /api/mint
Headers: x-admin-api-key: YOUR_ADMIN_KEY
Body: { "address": "0x...", "depositId": "deposit-id" }
```
Force mint an attestation for a deposit (admin only).

## WebSocket Events

Connect to the server using Socket.io:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('deposit:new', (deposit) => {
  console.log('New deposit:', deposit);
});

socket.on('deposit:verified', (result) => {
  console.log('Deposit verified:', result);
});

socket.on('attestation:minted', (attestation) => {
  console.log('Attestation minted:', attestation);
});
```

### Event Payloads

**deposit:new**
```json
{
  "id": "mock-1",
  "txid": "0xabcdef...",
  "wallet": "0x3FfC...",
  "amount": 12.5,
  "token": "USDC",
  "timestamp": 1699123456789
}
```

**deposit:verified**
```json
{
  "depositId": "mock-1",
  "valid": true
}
```

**attestation:minted**
```json
{
  "depositId": "mock-1",
  "address": "0x3FfC...",
  "tier": "Tier B",
  "tokenId": "mock-1699123456789"
}
```

## Smart Contract Deployment

### Deploy to Ethereum Testnet

1. Update your `.env` with Ethereum credentials:
```env
MODE=ethereum
ETH_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
ETH_PRIVATE_KEY=your_private_key
```

2. Deploy the contract:
```bash
npm run deploy:contract
```

3. Update `.env` with the deployed contract address:
```env
ETH_CONTRACT_ADDRESS=0x...
```

### Contract Details

The IOUSoulbound contract extends OpenZeppelin's ERC721 with:
- **Soulbound behavior**: Transfers are disabled
- **Tiered minting**: Support for multiple tiers
- **Metadata URI**: Per-token metadata support
- **Owner control**: Only owner can mint new tokens

Contract source: `contracts/IOUSoulbound.sol`

## Testing

Run tests:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

## Demo Script

Run the demo minting script:
```bash
npm run mint:demo
```

This will create sample deposits and mint attestations in the configured mode.

## Project Structure

```
scotopia-backend/
├── config/
│   └── default.json           # Default configuration
├── contracts/
│   └── IOUSoulbound.sol      # Solidity SBT contract
├── src/
│   ├── config/
│   │   └── loadConfig.ts     # Configuration loader
│   ├── db/
│   │   └── schema.ts         # Database schema
│   ├── listeners/
│   │   └── humidifiListener.ts  # Deposit event listener
│   ├── services/
│   │   ├── logger.ts         # Winston logger
│   │   ├── minter.ts         # Minting service
│   │   ├── privacy.ts        # Privacy tier logic
│   │   └── verifier.ts       # Deposit verification
│   └── server.ts             # Express server
├── scripts/
│   ├── deploy.ts             # Contract deployment
│   └── mint-demo.ts          # Demo script
├── data/                     # SQLite database (auto-created)
├── logs/                     # Log files (auto-created)
├── .env                      # Environment variables
├── hardhat.config.ts         # Hardhat configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Security Notes

⚠️ **Demo Purpose Only**: This is a hackathon demo and not production-ready.

Key security considerations for production:
- Add signed receipts from HumidiFi operator
- Implement on-chain commitment proofs
- Use production-grade authentication (not API keys)
- Add Merkle tree verification for audit trails
- Implement proper private key management
- Add rate limiting and input validation
- Use environment-specific configurations

## Integration with Frontend

### Example Integration

```typescript
// Connect to backend
const socket = io('http://localhost:3001');

// Listen for deposits
socket.on('deposit:new', async (deposit) => {
  const response = await fetch(`http://localhost:3001/api/deposits/${deposit.wallet}`);
  const data = await response.json();
  updateUI(data.deposits);
});

// Listen for attestations
socket.on('attestation:minted', async (attestation) => {
  const response = await fetch(`http://localhost:3001/api/attestations/${attestation.address}`);
  const data = await response.json();
  updateAttestations(data.attestations);
});
```

## Troubleshooting

### Database errors
Make sure the `data/` directory is writable:
```bash
chmod 755 data/
```

### Port already in use
Change the port in `.env`:
```env
PORT=3002
```

### Ethereum connection issues
- Verify your RPC URL is correct
- Check that you have testnet ETH for gas
- Ensure the contract is deployed to the correct network

### Solana connection issues
- Use a reliable RPC endpoint (not the default free tier)
- Verify the program ID is correct
- Check network status

## License

MIT

## Support

For questions or issues, please open a GitHub issue.

---

Built for Scotopia Hackathon 🏴󠁧󠁢󠁳󠁣󠁴󠁿

