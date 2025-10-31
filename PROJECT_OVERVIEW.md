# Scotopia Backend Project Overview

A hackathon-ready Node.js + TypeScript backend that listens for HumidiFi deposit events and mints soulbound IOU tokens.

## 🎯 What It Does

1. **Listens** for deposit events (mock, Ethereum, or Solana)
2. **Verifies** deposits (amount, timestamp, duplicates, rate limiting)
3. **Assigns** privacy tiers (A, B, C) based on deposit amounts
4. **Mints** soulbound IOU tokens as attestations
5. **Broadcasts** real-time events via WebSocket
6. **Exposes** REST API for querying attestations and deposits

## 📁 Project Structure

```
scotopia-backend/
├── 📄 README.md              - Main documentation
├── 📄 QUICKSTART.md          - 2-minute setup guide
├── 📄 INTEGRATION.md         - Frontend integration guide
├── 📄 ARCHITECTURE.md        - System design
├── 📄 package.json           - Dependencies
├── 📄 tsconfig.json          - TypeScript config
├── 
├── 📂 config/
│   └── default.json          - Default configuration
│
├── 📂 src/
│   ├── server.ts             - Main Express server
│   ├── config/
│   │   └── loadConfig.ts     - Configuration loader
│   ├── db/
│   │   └── schema.ts         - Database schema
│   ├── listeners/
│   │   └── humidifiListener.ts  - Event listener
│   └── services/
│       ├── logger.ts         - Winston logger
│       ├── minter.ts         - Minting service
│       ├── privacy.ts        - Privacy tiers
│       └── verifier.ts       - Deposit verification
│
├── 📂 contracts/
│   ├── IOUSoulbound.sol      - SBT contract
│   └── IABI.json             - Contract ABI
│
├── 📂 scripts/
│   ├── deploy.ts             - Deploy contract
│   └── mint-demo.ts          - Demo minting
│
└── 📂 test/
    └── Iousoulbound.test.ts  - Contract tests
```

## 🚀 Quick Start

```bash
npm install
npm run start:mock
```

Server runs on `http://localhost:3001`

## 🎭 Modes

### Mock Mode (Default)
Perfect for demos. Generates sample deposits every 5-10 seconds.

### Ethereum Mode
Connects to Sepolia testnet and listens to smart contract events.

### Solana Mode
Connects to Solana devnet and subscribes to program account changes.

## 🔌 API Endpoints

- `GET /health` - Health check
- `GET /api/status` - Server statistics
- `GET /api/attestations/:address` - Get attestations
- `GET /api/deposits/:address` - Get deposits
- `POST /api/mint` - Admin mint (protected)

## 📡 WebSocket Events

- `deposit:new` - New deposit received
- `deposit:verified` - Deposit verified
- `attestation:minted` - Attestation minted

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: SQLite (better-sqlite3)
- **WebSocket**: Socket.io
- **Blockchain**: ethers.js, @solana/web3.js
- **Testing**: Vitest, Hardhat
- **Smart Contracts**: Hardhat, OpenZeppelin

## 📚 Documentation

- **README.md** - Comprehensive guide
- **QUICKSTART.md** - Fast setup
- **INTEGRATION.md** - Frontend integration
- **ARCHITECTURE.md** - System design
- **FINAL_SUMMARY.md** - Project summary

## ✅ Features Implemented

✅ Multi-mode listener (mock, Ethereum, Solana)  
✅ Deposit verification and rate limiting  
✅ Privacy tier system  
✅ Soulbound token minting  
✅ Real-time WebSocket updates  
✅ REST API with all endpoints  
✅ Smart contract with tests  
✅ Comprehensive documentation  
✅ Quick start guide  
✅ Integration examples  

## 🔒 Security

⚠️ **Demo mode only** - not production-ready

For production, add:
- Signed receipts from operator
- On-chain commitment proofs
- Merkle tree verification
- Proper authentication
- Audit logging

## 📦 Dependencies

See `package.json` for complete list.

**Key runtime:**
- express, ethers, @solana/web3.js
- better-sqlite3, socket.io, winston

**Key dev:**
- typescript, vitest, hardhat
- @openzeppelin/contracts

## 🎓 Learning Resources

- Check `INTEGRATION.md` for frontend examples
- Check `ARCHITECTURE.md` for system design
- Check contract tests in `test/`

## 🤝 Contributing

This is a hackathon project. Feel free to:
- Fork and extend
- Submit issues
- Improve documentation
- Add features

## 📄 License

MIT License - see LICENSE file

---

**Built for Scotopia Hackathon** 🏴󠁧󠁢󠁳󠁣󠁴󠁿

Questions? Check the docs or open an issue!

