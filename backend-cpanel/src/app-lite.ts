import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Swagger Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mock data storage (in production, use a database)
const contracts: any[] = [];
let contractCounter = 1000;

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'SyloPay BNPL API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      stellar: '/api/stellar/health',
      quotation: '/api/quotation',
      contract: '/api/contract',
      createAccount: '/api/stellar/create-account'
    }
  });
});

// Health check
app.get('/health', async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      api: 'healthy',
      stellar: 'mocked'
    }
  });
});

// Stellar health check (mocked)
app.get('/api/stellar/health', async (req, res) => {
  res.json({
    connected: true,
    network: 'TESTNET',
    latestLedger: Math.floor(Date.now() / 1000),
    horizonUrl: 'https://horizon-testnet.stellar.org',
    note: 'Using mocked Stellar service for demo'
  });
});

// Create Stellar account (mocked)
app.post('/api/stellar/create-account', async (req, res) => {
  // Generate mock keys
  const mockPublicKey = 'G' + Math.random().toString(36).substr(2, 9).toUpperCase() +
                        Math.random().toString(36).substr(2, 20).toUpperCase();
  const mockSecretKey = 'S' + Math.random().toString(36).substr(2, 9).toUpperCase() +
                        Math.random().toString(36).substr(2, 20).toUpperCase();

  res.json({
    success: true,
    account: {
      publicKey: mockPublicKey,
      secretKey: process.env.NODE_ENV === 'development' ? mockSecretKey : '[HIDDEN]'
    },
    balance: '10000.0000000',
    explorerUrl: `https://stellar.expert/explorer/testnet/account/${mockPublicKey}`,
    note: 'Mock account for demo - not on real blockchain'
  });
});

// Get account info (mocked)
app.get('/api/stellar/account/:publicKey', async (req, res) => {
  const { publicKey } = req.params;

  res.json({
    publicKey,
    balance: '10000.0000000',
    sequence: Math.floor(Date.now() / 1000).toString(),
    explorerUrl: `https://stellar.expert/explorer/testnet/account/${publicKey}`,
    note: 'Mock data for demo'
  });
});

// Quotation endpoint
app.post('/api/quotation', async (req, res) => {
  try {
    const { amount, installments = 3 } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    const options = [2, 3, 4].map(count => {
      const installmentValue = (parseFloat(amount) / count).toFixed(2);
      return {
        installmentsCount: count,
        installmentAmount: installmentValue,
        totalAmount: amount,
        frequencyDays: 30,
        interestRate: '0.0000',
        description: `${count}x de R$ ${installmentValue}`
      };
    });

    res.json({
      success: true,
      originalAmount: amount,
      options,
      currency: 'BRL',
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Quotation failed'
    });
  }
});

// Contract creation
app.post('/api/contract', async (req, res) => {
  try {
    const { merchantPublicKey, customerPublicKey, totalAmount, installmentsCount, customerData } = req.body;

    if (!totalAmount || !installmentsCount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create contract
    const contractId = `BNPL-${contractCounter++}-${Date.now()}`;
    const installmentAmount = (parseFloat(totalAmount) / installmentsCount).toFixed(2);

    const contract: any = {
      id: contractId,
      merchantPublicKey: merchantPublicKey || 'MERCHANT_' + Math.random().toString(36).substr(2, 9),
      customerPublicKey: customerPublicKey || 'CUSTOMER_' + Math.random().toString(36).substr(2, 9),
      totalAmount,
      installmentsCount,
      installmentAmount,
      status: 'active',
      customerData: customerData || {},
      createdAt: new Date().toISOString(),
      installments: []
    };

    // Generate installments
    for (let i = 1; i <= installmentsCount; i++) {
      contract.installments.push({
        number: i,
        amount: installmentAmount,
        dueDate: new Date(Date.now() + (30 * i * 24 * 60 * 60 * 1000)).toISOString(),
        status: 'pending',
        txHash: null
      });
    }

    contracts.push(contract);

    res.json({
      success: true,
      contract
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Contract creation failed'
    });
  }
});

// Get contract by ID
app.get('/api/contract/:id', (req, res) => {
  const { id } = req.params;
  const contract = contracts.find(c => c.id === id);

  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  res.json({
    success: true,
    contract
  });
});

// Get all contracts
app.get('/api/contracts', (req, res) => {
  res.json({
    success: true,
    contracts,
    total: contracts.length
  });
});

// Process payment (mocked)
app.post('/api/stellar/process-payment', async (req, res) => {
  const { contractId, installmentNumber } = req.body;

  // Mock transaction hash
  const txHash = 'TX' + Math.random().toString(36).substr(2, 20).toUpperCase();

  // Update contract if exists
  const contract = contracts.find(c => c.id === contractId);
  if (contract && contract.installments[installmentNumber - 1]) {
    contract.installments[installmentNumber - 1].status = 'paid';
    contract.installments[installmentNumber - 1].txHash = txHash;
    contract.installments[installmentNumber - 1].paidAt = new Date().toISOString();
  }

  res.json({
    success: true,
    txHash,
    explorerUrl: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
    note: 'Mock transaction for demo'
  });
});

// Error handling
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`SyloPay Backend (Lite) running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Note: Using mocked Stellar service for demo`);
});

export default app;