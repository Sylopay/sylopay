import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import * as etherfuseService from './services/etherfuse';
import * as sorobanService from './services/soroban';
import { verifyEtherfuseWebhook } from './middleware/webhookVerify';

config();

const app = express();
const PORT = process.env.PORT || 3000;

// Stellar Horizon API URL
const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// In-memory storage for contracts
const contracts: any[] = [];
let contractCounter = 1000;

// Helper function to generate random Stellar-like keys
function generateMockKeys() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let publicKey = 'G';
  let secretKey = 'S';

  for (let i = 0; i < 55; i++) {
    publicKey += chars[Math.floor(Math.random() * chars.length)];
    secretKey += chars[Math.floor(Math.random() * chars.length)];
  }

  return { publicKey, secretKey };
}

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
  try {
    // Check Stellar connection
    const stellarResponse = await fetch(`${HORIZON_URL}`)
      .then(r => r.ok)
      .catch(() => false);

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        stellar: stellarResponse ? 'healthy' : 'degraded'
      }
    });
  } catch (error) {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        stellar: 'degraded'
      }
    });
  }
});

// Stellar health check using REST API
app.get('/api/stellar/health', async (req, res) => {
  try {
    const response = await fetch(`${HORIZON_URL}/ledgers?order=desc&limit=1`);

    if (!response.ok) {
      throw new Error('Horizon API error');
    }

    const data: any = await response.json();
    const latestLedger = data._embedded?.records?.[0];

    res.json({
      connected: true,
      network: 'TESTNET',
      latestLedger: latestLedger?.sequence || 0,
      horizonUrl: HORIZON_URL,
      closedAt: latestLedger?.closed_at || null
    });
  } catch (error) {
    res.json({
      connected: false,
      network: 'TESTNET',
      error: 'Could not connect to Stellar network',
      horizonUrl: HORIZON_URL
    });
  }
});

// Create Stellar account (using Friendbot)
app.post('/api/stellar/create-account', async (req, res) => {
  try {
    // Generate keypair (mock for now - real implementation would need crypto)
    const keys = generateMockKeys();

    // Try to fund account using Friendbot
    try {
      const friendbotResponse = await fetch(
        `https://friendbot.stellar.org?addr=${encodeURIComponent(keys.publicKey)}`
      );

      if (friendbotResponse.ok) {
        res.json({
          success: true,
          account: {
            publicKey: keys.publicKey,
            secretKey: process.env.NODE_ENV === 'development' ? keys.secretKey : '[HIDDEN]'
          },
          funded: true,
          explorerUrl: `https://stellar.expert/explorer/testnet/account/${keys.publicKey}`
        });
        return;
      }
    } catch (e) {
      // Friendbot failed, continue with mock
    }

    // Return mock account if Friendbot fails
    res.json({
      success: true,
      account: {
        publicKey: keys.publicKey,
        secretKey: process.env.NODE_ENV === 'development' ? keys.secretKey : '[HIDDEN]'
      },
      funded: false,
      explorerUrl: `https://stellar.expert/explorer/testnet/account/${keys.publicKey}`,
      note: 'Mock account generated (Friendbot unavailable)'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Account creation failed'
    });
  }
});

// Get account info from Stellar
app.get('/api/stellar/account/:publicKey', async (req, res) => {
  const { publicKey } = req.params;

  try {
    // Try to fetch real account from Stellar
    const response = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);

    if (response.ok) {
      const account: any = await response.json();
      const xlmBalance = account.balances?.find(
        (b: any) => b.asset_type === 'native'
      )?.balance || '0';

      res.json({
        publicKey,
        balance: xlmBalance,
        sequence: account.sequence,
        exists: true,
        explorerUrl: `https://stellar.expert/explorer/testnet/account/${publicKey}`
      });
      return;
    }
  } catch (error) {
    // Continue with mock response
  }

  // Return mock data if account doesn't exist or error
  res.json({
    publicKey,
    balance: '10000.0000000',
    sequence: Date.now().toString(),
    exists: false,
    explorerUrl: `https://stellar.expert/explorer/testnet/account/${publicKey}`,
    note: 'Mock data - account not found on network'
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
    const {
      merchantPublicKey,
      customerPublicKey,
      totalAmount,
      installmentsCount,
      customerData
    } = req.body;

    if (!totalAmount || !installmentsCount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate contract
    const contractId = `BNPL-${contractCounter++}-${Date.now()}`;
    const installmentAmount = (parseFloat(totalAmount) / installmentsCount).toFixed(2);

    const contract: any = {
      id: contractId,
      merchantPublicKey: merchantPublicKey || generateMockKeys().publicKey,
      customerPublicKey: customerPublicKey || generateMockKeys().publicKey,
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

    // Try to record on Stellar (best effort)
    try {
      const memoText = `BNPL:${contractId}`;
      console.log(`Contract ${contractId} created (memo: ${memoText})`);
    } catch (e) {
      // Continue even if Stellar recording fails
    }

    res.json({
      success: true,
      contract,
      stellarStatus: 'Contract created locally'
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

// Process payment
app.post('/api/stellar/process-payment', async (req, res) => {
  const { contractId, installmentNumber } = req.body;

  // Generate mock transaction hash
  const txHash = Array.from({length: 64}, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('').toUpperCase();

  // Update contract
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
    status: 'Payment processed (simulated)'
  });
});

// Get transactions for account
app.get('/api/stellar/transactions/:accountId', async (req, res) => {
  const { accountId } = req.params;

  try {
    const response = await fetch(
      `${HORIZON_URL}/accounts/${accountId}/transactions?order=desc&limit=10`
    );

    if (response.ok) {
      const data: any = await response.json();
      res.json({
        success: true,
        transactions: data._embedded?.records || []
      });
      return;
    }
  } catch (error) {
    // Continue with mock response
  }

  // Return mock transactions
  res.json({
    success: true,
    transactions: [],
    note: 'No transactions found'
  });
});

// ────────────────────────────────────────────────────────────────────────────
// ROTAS ETHERFUSE — On-ramp / Off-ramp
// ────────────────────────────────────────────────────────────────────────────

// POST /api/etherfuse/quote-onramp
// Gera uma cotação BRL → USDC e retorna dados para o cliente
app.post('/api/etherfuse/quote-onramp', async (req, res) => {
  try {
    const { amount_brl, wallet_address } = req.body;
    if (!amount_brl || amount_brl <= 0) {
      return res.status(400).json({ error: 'amount_brl inválido' });
    }
    if (!wallet_address) {
      return res.status(400).json({ error: 'wallet_address obrigatório' });
    }
    const quote = await etherfuseService.criarQuoteOnramp(amount_brl, wallet_address);
    res.json({ success: true, quote });
  } catch (error) {
    console.error('[Route] /api/etherfuse/quote-onramp error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao criar quote' });
  }
});

// POST /api/etherfuse/order
// Cria uma ordem de pagamento (retorna chave Pix)
app.post('/api/etherfuse/order', async (req, res) => {
  try {
    const { quoteId } = req.body;
    if (!quoteId) return res.status(400).json({ error: 'quoteId obrigatório' });
    const order = await etherfuseService.criarOrderOnramp(quoteId);
    res.json({ success: true, order });
  } catch (error) {
    console.error('[Route] /api/etherfuse/order error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao criar order' });
  }
});

// GET /api/etherfuse/order/:orderId
// Polling de status da ordem
app.get('/api/etherfuse/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await etherfuseService.buscarOrder(orderId);
    res.json({ success: true, order });
  } catch (error) {
    console.error('[Route] /api/etherfuse/order GET error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao buscar order' });
  }
});

// GET /api/etherfuse/assets
// Lista ativos disponíveis na Stellar
app.get('/api/etherfuse/assets', async (_req, res) => {
  try {
    const assets = await etherfuseService.listarAtivos();
    res.json({ success: true, assets });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao listar ativos' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// ROTAS SOROBAN — Contrato BNPL on-chain
// ────────────────────────────────────────────────────────────────────────────

// POST /api/soroban/contract
// Cria um contrato BNPL on-chain (substitui o /api/contract mock)
app.post('/api/soroban/contract', async (req, res) => {
  try {
    const { merchantPublicKey, customerPublicKey, totalAmountUsdc, installmentsCount } = req.body;
    if (!totalAmountUsdc || !installmentsCount) {
      return res.status(400).json({ error: 'totalAmountUsdc e installmentsCount são obrigatórios' });
    }

    const merchant = merchantPublicKey || process.env.STELLAR_MERCHANT_PUBLIC || '';
    const cliente  = customerPublicKey  || process.env.STELLAR_CUSTOMER_PUBLIC  || '';

    const { contratoId, txHash } = await sorobanService.criarContratoBNPL(
      merchant,
      cliente,
      Math.round(totalAmountUsdc * 10_000_000), // converte para micro-USDC
      installmentsCount
    );

    res.json({
      success: true,
      contratoId,
      txHash,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
      contractUrl: `https://stellar.expert/explorer/testnet/contract/${process.env.SOROBAN_CONTRACT_ID}`,
    });
  } catch (error) {
    console.error('[Route] /api/soroban/contract error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao criar contrato on-chain' });
  }
});

// GET /api/soroban/contract/:contratoId
// Lê status do contrato diretamente on-chain
app.get('/api/soroban/contract/:contratoId', async (req, res) => {
  try {
    const { contratoId } = req.params;
    const contrato = await sorobanService.statusContrato(contratoId);
    res.json({ success: true, contrato });
  } catch (error) {
    console.error('[Route] /api/soroban/contract GET error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao consultar contrato' });
  }
});

// GET /api/soroban/contracts/cliente/:publicKey
// Lista contratos de um cliente
app.get('/api/soroban/contracts/cliente/:publicKey', async (req, res) => {
  try {
    const { publicKey } = req.params;
    const contratos = await sorobanService.listarContratosCliente(publicKey);
    res.json({ success: true, contratos });
  } catch (error) {
    console.error('[Route] /api/soroban/contracts/cliente error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao listar contratos' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// WEBHOOK ETHERFUSE
// ────────────────────────────────────────────────────────────────────────────

// POST /webhook/etherfuse
// Recebe eventos da Etherfuse (payment_received, order_completed)
app.post('/webhook/etherfuse', verifyEtherfuseWebhook, async (req, res) => {
  const event = req.body;
  console.log('[Webhook] Evento recebido:', JSON.stringify(event, null, 2));

  try {
    const { type, data } = event;

    if (type === 'payment_received' || type === 'order_completed') {
      const { orderId, txHash, metadata } = data || {};

      // O frontend deve passar contratoId e numeroParcela como metadata ao criar a order
      const contratoId    = metadata?.contratoId;
      const numeroParcela = metadata?.numeroParcela;

      if (contratoId && numeroParcela && txHash) {
        console.log(`[Webhook] Pagando parcela ${numeroParcela} do contrato ${contratoId}`);
        await sorobanService.pagarParcela(contratoId, Number(numeroParcela), txHash);
        console.log(`[Webhook] ✅ Parcela ${numeroParcela} paga on-chain`);
      } else {
        console.warn('[Webhook] Metadados insuficientes para pagar parcela:', { contratoId, numeroParcela, txHash });
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Erro ao processar evento:', error);
    // Retornamos 200 para evitar reenvios em loop; logamos o erro internamente
    res.json({ received: true, error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// Error handling & 404
// ────────────────────────────────────────────────────────────────────────────

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
  console.log(`🚀 SyloPay Backend (Hybrid) running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`⭐ Stellar API: ${HORIZON_URL}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Soroban Contract: ${process.env.SOROBAN_CONTRACT_ID}`);
  console.log(`💳 Etherfuse: ${process.env.ETHERFUSE_BASE_URL}`);
});

export default app;