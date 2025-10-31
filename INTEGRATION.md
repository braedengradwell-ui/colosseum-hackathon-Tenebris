# Integration Guide

This document provides detailed information for integrating the Scotopia backend with frontend applications.

## WebSocket Integration

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
});
```

### Event Listeners

#### deposit:new
Emitted when a new deposit event is received.

```javascript
socket.on('deposit:new', (deposit) => {
  console.log('New deposit:', deposit);
  // {
  //   id: "mock-1",
  //   txid: "0xabcdef...",
  //   wallet: "0x3FfC...",
  //   amount: 12.5,
  //   token: "USDC",
  //   timestamp: 1699123456789
  // }
});
```

#### deposit:verified
Emitted after deposit verification completes.

```javascript
socket.on('deposit:verified', (result) => {
  console.log('Verification result:', result);
  // {
  //   depositId: "mock-1",
  //   valid: true | false,
  //   reason?: "error message"
  // }
});
```

#### attestation:minted
Emitted when an attestation is successfully minted.

```javascript
socket.on('attestation:minted', (attestation) => {
  console.log('Attestation minted:', attestation);
  // {
  //   depositId: "mock-1",
  //   address: "0x3FfC...",
  //   tier: "Tier B",
  //   tokenId: "mock-1699123456789"
  // }
});
```

## REST API Integration

### Fetch All Attestations

```javascript
async function fetchAttestations(walletAddress) {
  const response = await fetch(`http://localhost:3001/api/attestations/${walletAddress}`);
  const data = await response.json();
  return data.attestations;
}
```

### Fetch All Deposits

```javascript
async function fetchDeposits(walletAddress) {
  const response = await fetch(`http://localhost:3001/api/deposits/${walletAddress}`);
  const data = await response.json();
  return data.deposits;
}
```

### Check Server Status

```javascript
async function getStatus() {
  const response = await fetch('http://localhost:3001/api/status');
  const data = await response.json();
  return data;
}
```

### Mint Attestation (Admin)

```javascript
async function mintAttestation(address, depositId) {
  const response = await fetch('http://localhost:3001/api/mint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-api-key': 'YOUR_ADMIN_KEY',
    },
    body: JSON.stringify({ address, depositId }),
  });
  const data = await response.json();
  return data;
}
```

## Complete Integration Example

```typescript
import { io, Socket } from 'socket.io-client';

class ScotopiaClient {
  private socket: Socket;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.socket = io(baseUrl);
  }

  async getStatus() {
    const response = await fetch(`${this.baseUrl}/api/status`);
    return response.json();
  }

  async getAttestations(address: string) {
    const response = await fetch(`${this.baseUrl}/api/attestations/${address}`);
    const data = await response.json();
    return data.attestations;
  }

  async getDeposits(address: string) {
    const response = await fetch(`${this.baseUrl}/api/deposits/${address}`);
    const data = await response.json();
    return data.deposits;
  }

  onDeposit(callback: (deposit: any) => void) {
    this.socket.on('deposit:new', callback);
  }

  onVerified(callback: (result: any) => void) {
    this.socket.on('deposit:verified', callback);
  }

  onMinted(callback: (attestation: any) => void) {
    this.socket.on('attestation:minted', callback);
  }

  disconnect() {
    this.socket.disconnect();
  }
}

// Usage
const client = new ScotopiaClient();

client.onDeposit((deposit) => {
  console.log('New deposit:', deposit);
});

client.onMinted((attestation) => {
  console.log('Attestation minted:', attestation);
});

const attestations = await client.getAttestations('0x3FfC...');
```

## Privacy Tiers

The backend automatically assigns tiers based on deposit amounts:

```typescript
interface Tier {
  name: string;
  threshold: number;
}

const tiers: Tier[] = [
  { name: 'Tier A', threshold: 100 },
  { name: 'Tier B', threshold: 10 },
  { name: 'Tier C', threshold: 1 },
];

function getTier(amount: number): string {
  if (amount >= 100) return 'Tier A';
  if (amount >= 10) return 'Tier B';
  if (amount >= 1) return 'Tier C';
  return 'No Tier';
}
```

## Error Handling

Always handle errors when making API calls:

```javascript
async function safeApiCall(url, options) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }
    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}
```

## Rate Limiting

The backend implements rate limiting (default: 100 requests per minute). Handle rate limit errors:

```javascript
async function apiCallWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
    }
  }
}
```

## Testing Locally

1. Start the backend in mock mode:
```bash
npm run start:mock
```

2. Open browser console and connect:
```javascript
const socket = io('http://localhost:3001');
socket.on('connect', () => console.log('Connected!'));
socket.on('deposit:new', console.log);
socket.on('attestation:minted', console.log);
```

3. Test API endpoints:
```bash
curl http://localhost:3001/api/status
curl http://localhost:3001/api/attestations/0x3FfC1234567890abcdef1234567890ABCDEFABCD
```

