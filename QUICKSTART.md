# Quick Start Guide

Get Scotopia backend running in under 2 minutes for your hackathon demo!

## 1. Install Dependencies

```bash
npm install
```

## 2. Start Mock Server

For development (recommended):
```bash
npm run dev:mock
```

Or build and run:
```bash
npm run build
npm run start:mock
```

That's it! The server is now running at `http://localhost:3001`.

## 3. Test It

Open a new terminal and run:

```bash
curl http://localhost:3001/api/status
```

You should see statistics about deposits and attestations.

## 4. Watch Live Events

The mock server automatically generates deposit events every 5-10 seconds. You can watch them in the server logs.

## 5. Connect Your Frontend

Use Socket.io to connect:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('deposit:new', (deposit) => {
  console.log('New deposit:', deposit);
});

socket.on('attestation:minted', (attestation) => {
  console.log('Attestation minted:', attestation);
});
```

## That's It! 🎉

You now have a working Scotopia backend. Check out:
- `README.md` for full documentation
- `INTEGRATION.md` for frontend integration details
- API endpoints at `http://localhost:3001/api/*`

## Next Steps

### Deploy to Ethereum Testnet

1. Update `.env`:
```env
MODE=ethereum
ETH_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
ETH_PRIVATE_KEY=your_private_key
```

2. Deploy contract:
```bash
npm run deploy:contract
```

3. Update `.env` with the contract address and restart:
```bash
npm run start
```

### Run Tests

```bash
npm test                 # Run all tests
npm run test:contract    # Run contract tests
```

### Development Mode

For hot-reload during development:

```bash
npm run dev:mock
```

---

Questions? Check the full README.md or open an issue.

