import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { loadConfig } from './config/loadConfig.js';
import { initializeDatabase, Deposit } from './db/schema.js';
import { HumidifiListener, DepositEvent } from './listeners/humidifiListener.js';
import { MinterService } from './services/minter.js';
import { verifyDeposit, checkDuplicate } from './services/verifier.js';
import { getPrivacyTier } from './services/privacy.js';
import { logger } from './services/logger.js';
import { v4 as uuidv4 } from 'uuid';

const config = loadConfig();
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
  },
});

// Database
const db = initializeDatabase(config.database.path);

// Services
const minter = new MinterService(config, db);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.max,
});

app.use('/api/', limiter);

// Admin authentication middleware
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = req.headers['x-admin-api-key'];
  if (apiKey !== config.security.adminApiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Listeners
const listener = new HumidifiListener(config);

// REST API Routes

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    mode: config.mode,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/status', async (req, res) => {
  try {
    const deposits = db.prepare('SELECT COUNT(*) as count FROM deposits').get() as { count: number };
    const attestations = db.prepare('SELECT COUNT(*) as count FROM attestations').get() as { count: number };
    const recent = db.prepare(`
      SELECT * FROM deposits ORDER BY created_at DESC LIMIT 5
    `).all();

    res.json({
      mode: config.mode,
      deposits: deposits.count,
      attestations: attestations.count,
      recentEvents: recent,
    });
  } catch (error) {
    logger.error('Error getting status', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/mint', requireAdmin, async (req, res) => {
  try {
    const { address, depositId } = req.body;

    if (!address || !depositId) {
      return res.status(400).json({ error: 'Address and depositId required' });
    }

    const deposit = db.prepare('SELECT * FROM deposits WHERE id = ?').get(depositId) as Deposit;
    
    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    if (deposit.processed) {
      return res.status(400).json({ error: 'Deposit already processed' });
    }

    const tier = getPrivacyTier(deposit.amount, config.privacy.tiers).tier;
    const result = await minter.mintAttestation(deposit, tier);

    if (result.success) {
      io.emit('attestation:minted', {
        depositId,
        address,
        tier,
        tokenId: result.tokenId,
      });

      res.json({
        success: true,
        attestationId: result.attestationId,
        tokenId: result.tokenId,
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Error minting attestation', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/attestations/:address', (req, res) => {
  try {
    const { address } = req.params;
    const attestations = minter.getAttestations(address);
    res.json({ attestations });
  } catch (error) {
    logger.error('Error fetching attestations', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/deposits/:address', (req, res) => {
  try {
    const { address } = req.params;
    const deposits = db.prepare('SELECT * FROM deposits WHERE wallet = ? ORDER BY created_at DESC').all(address);
    res.json({ deposits });
  } catch (error) {
    logger.error('Error fetching deposits', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WebSocket event handlers

io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

// Deposit event handler
listener.on('deposit', async (deposit: DepositEvent) => {
  try {
    logger.info('Processing deposit event', { depositId: deposit.id });

    // Save deposit to database
    const dbDeposit: Deposit = {
      id: deposit.id,
      txid: deposit.txid,
      wallet: deposit.wallet,
      amount: deposit.amount,
      token: deposit.token,
      timestamp: deposit.timestamp,
      processed: false,
      created_at: new Date().toISOString(),
    };

    db.prepare(`
      INSERT INTO deposits (id, txid, wallet, amount, token, timestamp, processed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      dbDeposit.id,
      dbDeposit.txid,
      dbDeposit.wallet,
      dbDeposit.amount,
      dbDeposit.token,
      dbDeposit.timestamp,
      dbDeposit.processed ? 1 : 0
    );

    // Emit to connected clients
    io.emit('deposit:new', deposit);

    // Verify deposit
    const verification = verifyDeposit(dbDeposit);
    
    if (!verification.valid) {
      logger.warn('Deposit verification failed', { depositId: deposit.id, reason: verification.reason });
      io.emit('deposit:verified', {
        depositId: deposit.id,
        valid: false,
        reason: verification.reason,
      });
      return;
    }

    // Check for duplicates
    const existingDeposits = db.prepare('SELECT * FROM deposits WHERE txid = ?').all(deposit.txid) as Deposit[];
    if (checkDuplicate(dbDeposit, existingDeposits)) {
      logger.warn('Duplicate deposit detected', { depositId: deposit.id });
      io.emit('deposit:verified', {
        depositId: deposit.id,
        valid: false,
        reason: 'Duplicate deposit',
      });
      return;
    }

    io.emit('deposit:verified', {
      depositId: deposit.id,
      valid: true,
    });

    // Auto-mint in mock mode
    if (config.mode === 'mock') {
      const tier = getPrivacyTier(deposit.amount, config.privacy.tiers);
      const result = await minter.mintAttestation(dbDeposit, tier.tier);

      if (result.success) {
        io.emit('attestation:minted', {
          depositId: deposit.id,
          address: deposit.wallet,
          tier: tier.tier,
          tokenId: result.tokenId,
        });
      }
    }
  } catch (error) {
    logger.error('Error processing deposit', error);
  }
});

// Start server
async function start() {
  try {
    await minter.initialize();
    await listener.start();

    httpServer.listen(config.port, () => {
      logger.info(`Scotopia backend server started`, {
        mode: config.mode,
        port: config.port,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await listener.stop();
  httpServer.close();
  db.close();
  process.exit(0);
});

start();

