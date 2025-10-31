# Architecture Overview

## System Design

Scotopia backend is designed as an event-driven system that listens for deposit events and mints soulbound IOU tokens.

```
┌─────────────────┐
│  HumidiFi       │
│  Events         │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│   HumidifiListener              │
│   (Mock/Ethereum/Solana)        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Deposit Verification          │
│   - Amount check                │
│   - Timestamp validation        │
│   - Rate limiting               │
│   - Duplicate detection         │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Privacy Tier Assignment       │
│   Tier A: ≥100                  │
│   Tier B: ≥10                   │
│   Tier C: ≥1                    │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Minter Service                │
│   - Mint SBT                    │
│   - Store attestation           │
│   - Emit events                 │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Database                      │
│   - deposits table              │
│   - attestations table          │
└─────────────────────────────────┘
```

## Components

### 1. HumidifiListener

Listens for deposit events from HumidiFi.

**Modes:**
- **Mock**: Generates sample events for demos
- **Ethereum**: Listens to smart contract events via ethers.js
- **Solana**: Subscribes to program account changes via @solana/web3.js

**Files:**
- `src/listeners/humidifiListener.ts`

### 2. Verifier Service

Validates deposit events before processing.

**Checks:**
- Amount > 0
- Timestamp within 24 hours
- No future timestamps
- Valid wallet address format
- Rate limiting (10 events per minute per wallet)

**Files:**
- `src/services/verifier.ts`

### 3. Privacy Service

Assigns privacy tiers to deposits.

**Tiers:**
- Tier A: ≥100
- Tier B: ≥10
- Tier C: ≥1

**Files:**
- `src/services/privacy.ts`

### 4. Minter Service

Mints soulbound attestation tokens.

**Functionality:**
- Ethereum: Calls smart contract `mintAttestation()` or `mintTier()`
- Solana: Mock minting (for demo)
- Mock: Generates pseudo token IDs

**Files:**
- `src/services/minter.ts`

### 5. Database Layer

SQLite database for persistence.

**Tables:**
- `deposits`: All deposit events
- `attestations`: Minted attestations

**Files:**
- `src/db/schema.ts`

### 6. API Layer

Express.js REST API.

**Endpoints:**
- `GET /health`: Health check
- `GET /api/status`: Statistics
- `GET /api/attestations/:address`: Get attestations
- `GET /api/deposits/:address`: Get deposits
- `POST /api/mint`: Admin mint (protected)

**Files:**
- `src/server.ts`

### 7. WebSocket Layer

Socket.io for real-time updates.

**Events:**
- `deposit:new`: New deposit received
- `deposit:verified`: Deposit verified
- `attestation:minted`: Attestation minted

**Files:**
- `src/server.ts`

## Data Flow

### Mock Mode

1. Listener generates sample deposit every 5-10s
2. Deposits saved to database
3. Verified for validity
4. Privacy tier assigned
5. Attestation auto-minted
6. Events emitted via WebSocket

### Ethereum Mode

1. Listener subscribes to contract Deposit events
2. Events parsed and converted to DepositEvent
3. Same verification and minting flow as mock
4. Real blockchain transactions executed
5. Events emitted via WebSocket

### Solana Mode

1. Listener subscribes to program account changes
2. Events parsed from account data
3. Same verification and minting flow as mock
4. Mock minting (placeholder for real implementation)
5. Events emitted via WebSocket

## Configuration

Configuration loaded from:
1. `config/default.json`: Default values
2. `.env`: Environment-specific overrides

**Hierarchy:**
1. Environment variables override defaults
2. Config merged at startup
3. Applied globally to all services

## Security Model

### Current (Demo)
- API key authentication for admin endpoints
- Rate limiting (100 req/min)
- Input validation
- Duplicate detection

### Production Requirements
- Signed receipts from HumidiFi operator
- On-chain commitment proofs
- Merkle tree verification
- Private key management
- Audit logging
- HTTPS/TLS

## Scalability

Current demo focused on simplicity:
- Single instance
- SQLite file-based storage
- In-memory rate limiting
- No clustering

Production considerations:
- PostgreSQL for concurrent access
- Redis for rate limiting
- Horizontal scaling
- Load balancing
- Message queue for events

## Error Handling

- Try-catch blocks around critical operations
- Winston logging for errors
- Graceful degradation
- User-friendly error messages
- Retry logic for external calls

## Testing Strategy

- **Unit tests**: Vitest for services
- **Contract tests**: Hardhat for Solidity
- **Integration tests**: Full flow tests (TODO)

## Deployment

### Local Development
```bash
npm run start:mock
```

### Production
```bash
npm run build
npm run start
```

### Docker (TODO)
- Containerize with Docker
- Multi-stage build
- Environment variables
- Health checks

