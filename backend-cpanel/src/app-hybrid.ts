import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import * as etherfuseService from './services/etherfuse';
import * as sorobanService from './services/soroban';
import { Transaction, TransactionBuilder, rpc as SorobanRpc, Keypair, Networks, Operation, Asset, BASE_FEE, Account } from '@stellar/stellar-sdk';
import { verifyEtherfuseWebhook } from './middleware/webhookVerify';

import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 5 * 1000, // 5 segundos
  max: 10,            // máximo 10 requisições por IP por janela
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down.' }
});



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

app.use('/api/soroban/contracts/cliente', limiter);
app.use('/api/stellar/account', limiter);

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

import { contracts, saveContracts } from './services/storage';

let contractCounter = 1000;
if (contracts && contracts.length > 0) {
  // Pega o número do último ID (ex: BNPL-1005 -> 1005)
  const lastId = contracts[contracts.length - 1].id;
  const match = lastId.match(/BNPL-(\d+)/);
  if (match) contractCounter = parseInt(match[1], 10) + 1;
}

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
      createAccount: '/api/stellar/create-account',
      x402: {
        paymentPointer: '/api/x402/payment-pointer',
        invoice: '/api/x402/invoice/:contractId'
      }
    }
  });
});

// ─── Protocol x402: Interoperable Payment Pointer & Monetization ─────────────────
app.get('/api/x402/payment-pointer', (req, res) => {
  res.json({
    protocol: 'x402',
    monetizationEnabled: true,
    paymentPointer: '$stellar.sylopay.com/merchant-vault',
    supportedAssets: ['USDC', 'XLM'],
    network: 'stellar-testnet',
    sorobanContractReceiver: 'CDJFOVTWLKX7EF7VSLRV5MYEHH2HS4T3QG6XKYHHOQXSS66QDNMYHWFG'
  });
});

app.get('/api/x402/invoice/:contractId', (req, res) => {
  const { contractId } = req.params;
  const contract = contracts.find(c => c.id === contractId);

  if (!contract) {
    return res.status(404).json({ error: 'Contract not found for x402 payment request' });
  }

  res.json({
    protocol: 'x402',
    status: 'payment_required',
    invoiceId: `x402_inv_${contractId}`,
    amount: contract.installments[0]?.amount || '18.52',
    asset: 'USDC',
    destination: contract.merchantPublicKey || 'GB6KJLKUNBSOFCOXHG4HOXRKCEAEKFZUCTMRQSZL3GFK4LFXUFFW4ICJ',
    sorobanCall: {
      contract: 'CDJFOVTWLKX7EF7VSLRV5MYEHH2HS4T3QG6XKYHHOQXSS66QDNMYHWFG',
      function: 'pagar_parcela',
      params: [contractId, 1]
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
    const { publicKey: existingPublicKey } = req.body;

    // Generate or use existing keypair
    const keys = existingPublicKey
      ? { publicKey: existingPublicKey, secretKey: '[PROVIDED]' }
      : generateMockKeys();

    const targetPublicKey = keys.publicKey;

    // Try to fund account using Friendbot
    try {
      const friendbotResponse = await fetch(
        `https://friendbot.stellar.org?addr=${encodeURIComponent(targetPublicKey)}`
      );

      if (friendbotResponse.ok) {
        res.json({
          success: true,
          account: {
            publicKey: targetPublicKey,
            secretKey: process.env.NODE_ENV === 'development' ? keys.secretKey : '[HIDDEN]'
          },
          funded: true,
          explorerUrl: `https://stellar.expert/explorer/testnet/account/${targetPublicKey}`
        });
        return;
      }
    } catch (e) {
      console.warn('[Stellar] Friendbot failed:', e);
    }

    // Return current state if Friendbot fails
    res.json({
      success: !!existingPublicKey, // If it's existing, we just return current state
      account: {
        publicKey: targetPublicKey,
        secretKey: process.env.NODE_ENV === 'development' ? keys.secretKey : '[HIDDEN]'
      },
      funded: false,
      explorerUrl: `https://stellar.expert/explorer/testnet/account/${targetPublicKey}`,
      note: existingPublicKey ? 'Funding failed (Friendbot unavailable)' : 'Mock account generated (Friendbot unavailable)'
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
        balances: account.balances, // Envia todos os saldos (USDC, etc)
        sequence: account.sequence,
        exists: true,
        explorerUrl: `https://stellar.expert/explorer/testnet/account/${publicKey}`
      });
      return;
    }
  } catch (error) {
    console.error('[Stellar] Erro ao buscar conta:', error);
  }

  // Não retornamos mais dados mockados se a conta não existir
  // Return 200 even if not exists, so frontend doesn't throw AxiosError
  res.json({
    publicKey,
    exists: false,
    balance: '0',
    error: 'Account not found on Stellar Testnet network'
  });
});

// Quotation endpoint
app.post('/api/quotation', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    // Simulated Blend Protocol live rate: 1.5–3.5% borrow range
    const blendBorrowRate = 1.5 + Math.random() * 2; // e.g. 2.31%
    // Consumer rate = 80% of Blend borrow rate (SyloPay discount vs direct DeFi)
    const consumerRate = blendBorrowRate * 0.8;   // e.g. 1.85%

    // SyloPay platform fees
    const MERCHANT_FEE_RATE = 0.035;  // 3.5% charged to merchant (included in product price)
    const SYLOPAY_CONSUMER_MARGIN = 0.005; // 0.5% SyloPay margin on consumer installments
    const TRANSACTION_FEE_USDC = 0.25; // flat $0.25 USDC per contract

    const principal = parseFloat(amount); // BRL amount

    const options = [2, 3, 4].map(count => {
      // Interest only applies for installment plans (not 1x)
      const interestRate = consumerRate + SYLOPAY_CONSUMER_MARGIN; // total consumer rate
      const interestAmount = principal * (interestRate / 100);
      const totalWithInterest = principal + interestAmount;
      const installmentValue = (totalWithInterest / count).toFixed(2);

      return {
        installmentsCount: count,
        installmentAmount: installmentValue,
        totalAmount: totalWithInterest.toFixed(2),
        frequencyDays: 30,
        interestRate: interestRate.toFixed(2),
        interestAmount: interestAmount.toFixed(2),
        merchantFeeRate: (MERCHANT_FEE_RATE * 100).toFixed(1),
        transactionFee: TRANSACTION_FEE_USDC,
        blendBorrowRate: parseFloat(blendBorrowRate.toFixed(2)),
        description: `${count}x of BRL ${installmentValue}`
      };
    });

    res.json({
      success: true,
      originalAmount: amount,
      options,
      currency: 'BRL',
      consumerRate: parseFloat(consumerRate.toFixed(2)),
      blendBorrowRate: parseFloat(blendBorrowRate.toFixed(2)),
      merchantFeeRate: (MERCHANT_FEE_RATE * 100).toFixed(1),
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
  const txHash = Array.from({ length: 64 }, () =>
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
      return res.status(400).json({ error: 'invalid amount_brl' });
    }
    if (!wallet_address) {
      return res.status(400).json({ error: 'wallet_address required' });
    }
    const quote = await etherfuseService.criarQuoteOnramp(amount_brl, wallet_address);
    res.json({ success: true, quote });
  } catch (error) {
    console.error('[Route] /api/etherfuse/quote-onramp FATAL ERROR:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error creating quote',
      details: error instanceof Error ? error.stack : undefined
    });
  }
});

// Memory store to simulate organic payment states for Sandbox/Demo orders
const sandboxOrdersMap = new Map<string, { createdAt: number }>();

// POST /api/etherfuse/order
// Cria uma ordem de pagamento (retorna chave Pix) com fallback para Sandbox
app.post('/api/etherfuse/order', async (req, res) => {
  const { quoteId } = req.body;
  if (!quoteId) return res.status(400).json({ error: 'quoteId required' });

  try {
    const order = await etherfuseService.criarOrderOnramp(quoteId);
    res.json({ success: true, order });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const isProxyError = /proxy account|bank.account|400/i.test(errMsg);

    if (isProxyError) {
      // ─────────────────────────────────────────────────────────────────────
      // SANDBOX LIMITATION: Etherfuse requires a "proxy account" to be
      // provisioned for your API key before orders can be created.
      //
      // To fix in production:
      //   1. Sign up at https://etherfuse.com and get your API key
      //   2. Email support@etherfuse.com to enable sandbox proxy provisioning
      //   3. Create a bank account via POST /ramp/bank-account
      //   4. Use the returned id as bankAccountId in POST /ramp/order
      //
      // Until then, returning a simulated sandbox order for demo purposes.
      // ─────────────────────────────────────────────────────────────────────
      console.warn('[Etherfuse] ⚠️  Proxy account not provisioned for this API key.');
      console.warn('[Etherfuse] → Sandbox fallback order returned for demo flow.');
      console.warn('[Etherfuse] → To resolve: contact support@etherfuse.com');
    } else {
      console.warn('[Route] /api/etherfuse/order — Unexpected error, using sandbox fallback:', errMsg);
    }

    const orderId = `sandbox-order-${Date.now()}`;
    const sandboxOrder = {
      id: orderId,
      quoteId,
      status: 'created',
      paymentInstructions: {
        pixKey: `00020126580014br.gov.bcb.pix0136${quoteId.replace(/-/g, '').slice(0, 32)}5204000053039865802BR5913SyloPay Demo6009Sao Paulo62070503***6304${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
        pixKeyType: 'random',
        amount: 100.00,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        bankName: 'Sandbox Bank (Demo)',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    sandboxOrdersMap.set(orderId, { createdAt: Date.now() });
    res.json({ success: true, order: sandboxOrder, sandbox: true });
  }
});

// GET /api/etherfuse/order/:orderId
// Polling de status da ordem (com fallback para ordens de Sandbox)
app.get('/api/etherfuse/order/:orderId', async (req, res) => {
  const { orderId } = req.params;

  // Ordens geradas pelo fallback de Sandbox retornam status progressivos
  if (orderId.startsWith('sandbox-order-')) {
    const cached = sandboxOrdersMap.get(orderId);
    let status: 'created' | 'pending' | 'completed' = 'completed';

    if (cached) {
      const elapsed = Date.now() - cached.createdAt;
      if (elapsed < 6000) {
        status = 'created'; // Waiting for payment
      } else if (elapsed < 14000) {
        status = 'pending'; // Payment detected — awaiting settlement
      } else {
        status = 'completed'; // Payment confirmed!
      }
    }

    return res.json({
      success: true,
      order: {
        id: orderId,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      sandbox: true,
    });
  }

  try {
    const order = await etherfuseService.buscarOrder(orderId);
    res.json({ success: true, order });
  } catch (error) {
    console.error('[Route] /api/etherfuse/order GET error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error fetching order' });
  }
});

// GET /api/etherfuse/assets
// Lista ativos disponíveis na Stellar
app.get('/api/etherfuse/assets', async (_req, res) => {
  try {
    const assets = await etherfuseService.listarAtivos();
    res.json({ success: true, assets });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error listing assets' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// ROTAS SOROBAN — Contrato BNPL on-chain
// ────────────────────────────────────────────────────────────────────────────

// POST /api/soroban/prepare-contract
// Retorna XDR para o usuário assinar via Freighter
app.post('/api/soroban/prepare-contract', async (req, res) => {
  console.log('[prepare-contract] body recebido:', JSON.stringify(req.body));
  try {
    const { merchantPublicKey, customerPublicKey, totalAmountUsdc, installmentsCount } = req.body;

    const xdrData = await sorobanService.prepararTransacaoCriarContrato(
      merchantPublicKey || process.env.STELLAR_MERCHANT_PUBLIC || '',
      customerPublicKey,
      Math.round(totalAmountUsdc * 10_000_000),
      installmentsCount
    );

    res.json({ success: true, xdr: xdrData.xdr });
  } catch (error) {
    console.error('[Route] /api/soroban/prepare-contract error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error preparing transaction' });
  }
});

// POST /api/soroban/create-contract
// Cria o contrato BNPL on-chain diretamente assinado pelo orquestrador/admin da SyloPay (sem Freighter do cliente)
app.post('/api/soroban/create-contract', async (req, res) => {
  try {
    const { merchantPublicKey, customerPublicKey, totalAmountUsdc, installmentsCount } = req.body;

    const totalUsdcStroops = Math.round(totalAmountUsdc * 10_000_000);

    const adminPublicKey = sorobanService.getAdminPublicKey();

    const result = await sorobanService.criarContratoBNPL(
      merchantPublicKey || process.env.STELLAR_MERCHANT_PUBLIC || '',
      adminPublicKey,
      totalUsdcStroops,
      installmentsCount
    );

    // Registra no banco local
    const contract = {
      id: result.contratoId,
      merchantPublicKey: merchantPublicKey || process.env.STELLAR_MERCHANT_PUBLIC || '',
      customerPublicKey,
      totalAmount: totalAmountUsdc,
      installmentsCount,
      installmentAmount: totalAmountUsdc / installmentsCount,
      status: 'active',
      createdAt: new Date().toISOString(),
      installments: Array.from({ length: installmentsCount }, (_, i) => ({
        number: i + 1,
        amount: totalAmountUsdc / installmentsCount,
        status: 'pending',
        txHash: null
      }))
    };

    contracts.push(contract);
    saveContracts();

    res.json({
      success: true,
      contratoId: result.contratoId,
      txHash: result.txHash,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.txHash}`
    });
  } catch (error) {
    console.error('[Route] /api/soroban/create-contract error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error creating contract' });
  }
});

// POST /api/soroban/submit-contract
// Recebe XDR assinado, submete e registra o contrato
app.post('/api/soroban/submit-contract', async (req, res) => {
  try {
    const { signedXdr, merchantPublicKey, customerPublicKey, totalAmountUsdc, installmentsCount } = req.body;

    // Submete a transação assinada pelo usuário
    console.log('[Soroban] Tipo de signedXdr:', typeof signedXdr);
    console.log('[Soroban] Conteúdo de signedXdr:', JSON.stringify(signedXdr, null, 2));

    // Tenta extrair a string caso seja um objeto (Freighter as vezes retorna { tx: "..." })
    const xdrString = typeof signedXdr === 'string' ? signedXdr : (signedXdr as any).signedTxXdr || (signedXdr as any).signedXdr || (signedXdr as any).tx || (signedXdr as any).xdr;

    if (!xdrString || typeof xdrString !== 'string') {
      throw new Error('Invalid or missing signedXdr format.');
    }

    const rpc = new SorobanRpc.Server(process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org');
    const innerTx = TransactionBuilder.fromXDR(xdrString, 'Test SDF Network ; September 2015') as Transaction;

    let finalTx: any = innerTx;
    const masterSecret = process.env.STELLAR_MASTER_SECRET;
    if (masterSecret) {
      console.log('[Soroban] Sponsoring transaction fee via Fee Bump!');
      const sponsorKeypair = Keypair.fromSecret(masterSecret);
      const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
        sponsorKeypair,
        '2000000',
        innerTx,
        'Test SDF Network ; September 2015'
      );
      feeBumpTx.sign(sponsorKeypair);
      finalTx = feeBumpTx;
    }

    const sendResult = await rpc.sendTransaction(finalTx);
    if (sendResult.status === 'ERROR') {
      throw new Error(`Error submitting signed tx: ${JSON.stringify(sendResult.errorResult)}`);
    }

    console.log('[Soroban] xdrString primeiros 100 chars:', xdrString?.slice(0, 100));
    console.log('[Soroban] xdrString length:', xdrString?.length);

    // Aguarda resultado para pegar o contratoId
    let txResult = await rpc.getTransaction(sendResult.hash);
    let attempts = 0;
    while (txResult.status === 'NOT_FOUND' && attempts < 20) {
      await new Promise(r => setTimeout(r, 1500));
      txResult = await rpc.getTransaction(sendResult.hash);
      attempts++;
    }

    if (txResult.status !== 'SUCCESS') {
      console.error('[Soroban] Network failure. Details:', JSON.stringify(txResult, null, 2));
      throw new Error(`Transaction failed on network. Status: ${txResult.status}`);
    }

    const contratoId = sorobanService.scValToNative(txResult.returnValue as any) as string;
    const txHash = sendResult.hash;

    // Registra no banco local
    const contract = {
      id: contratoId,
      merchantPublicKey,
      customerPublicKey,
      totalAmount: totalAmountUsdc,
      installmentsCount,
      installmentAmount: totalAmountUsdc / installmentsCount,
      status: 'active',
      createdAt: new Date().toISOString(),
      installments: Array.from({ length: installmentsCount }, (_, i) => ({
        number: i + 1,
        amount: totalAmountUsdc / installmentsCount,
        status: 'pending',
        txHash: null
      }))
    };

    contracts.push(contract);
    saveContracts();

    res.json({
      success: true,
      contratoId,
      txHash,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${txHash}`
    });
  } catch (error) {
    console.error('[Route] /api/soroban/submit-contract error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error submitting contract' });
  }
});

// POST /api/soroban/submit-transaction
// Submete qualquer transação assinada e aguarda confirmação
app.post('/api/soroban/submit-transaction', async (req, res) => {
  try {
    let { signedXdr } = req.body;
    if (typeof signedXdr === 'object' && signedXdr.signedTxXdr) {
      signedXdr = signedXdr.signedTxXdr;
    }

    console.log('[Soroban] Tipo de signedXdr (tx):', typeof signedXdr);
    console.log('[Soroban] Conteúdo de signedXdr (tx):', JSON.stringify(signedXdr, null, 2));

    const xdrString = typeof signedXdr === 'string' ? signedXdr : (signedXdr as any).signedTxXdr || (signedXdr as any).signedXdr || (signedXdr as any).tx || (signedXdr as any).xdr;

    if (!xdrString || typeof xdrString !== 'string') {
      throw new Error('Invalid or missing signedXdr format.');
    }

    const rpc = new SorobanRpc.Server(process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org');
    const innerTx = TransactionBuilder.fromXDR(xdrString, 'Test SDF Network ; September 2015') as Transaction;

    let finalTx: any = innerTx;
    const masterSecret = process.env.STELLAR_MASTER_SECRET;
    if (masterSecret) {
      console.log('[Soroban] Sponsoring transaction fee via Fee Bump!');
      const sponsorKeypair = Keypair.fromSecret(masterSecret);
      const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
        sponsorKeypair,
        '2000000',
        innerTx,
        'Test SDF Network ; September 2015'
      );
      feeBumpTx.sign(sponsorKeypair);
      finalTx = feeBumpTx;
    }

    const sendResult = await rpc.sendTransaction(finalTx);
    if (sendResult.status === 'ERROR') {
      throw new Error(`Error submitting tx: ${JSON.stringify(sendResult.errorResult)}`);
    }

    // Aguarda resultado
    let txResult = await rpc.getTransaction(sendResult.hash);
    let attempts = 0;
    while (txResult.status === 'NOT_FOUND' && attempts < 20) {
      await new Promise(r => setTimeout(r, 1500));
      txResult = await rpc.getTransaction(sendResult.hash);
      attempts++;
    }

    if (txResult.status !== 'SUCCESS') {
      console.error('[Soroban] Network failure (installment). Details:', JSON.stringify(txResult, null, 2));
    }

    res.json({
      success: txResult.status === 'SUCCESS',
      txHash: sendResult.hash,
      status: txResult.status,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${sendResult.hash}`
    });
  } catch (error) {
    console.error('[Route] /api/soroban/submit-transaction error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error submitting transaction' });
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
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error querying contract' });
  }
});

// ─── Security: On-chain USDC payment verifier ───────────────────────────────
// Fetches txHash from Stellar Horizon and confirms that:
//   1. The transaction is SUCCESSFUL on-chain.
//   2. It contains at least one Payment operation for USDC.
//   3. The USDC amount matches the expected installment amount (±1% tolerance).
// This prevents fraudulent forging of payment confirmations.
async function verifyUsdcPaymentOnChain(
  txHash: string,
  expectedMerchantPublicKey: string,
  expectedAmountUsdc: number
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const response = await fetch(`${HORIZON_URL}/transactions/${txHash}`);
    if (!response.ok) {
      return { valid: false, reason: `Transaction not found on Stellar network (HTTP ${response.status})` };
    }

    const tx: any = await response.json();

    // 1. Must be successful
    if (!tx.successful) {
      return { valid: false, reason: `Transaction ${txHash} is NOT successful on-chain` };
    }

    // 2. Fetch operations to verify USDC payment
    const opsResp = await fetch(`${HORIZON_URL}/transactions/${txHash}/operations`);
    if (!opsResp.ok) {
      return { valid: false, reason: 'Could not fetch transaction operations from Horizon' };
    }
    const opsData: any = await opsResp.json();
    const operations: any[] = opsData._embedded?.records || [];

    // 3. Find a payment operation for USDC going to the merchant
    const USDC_ASSET_CODE = 'USDC';
    const usdcPayment = operations.find((op: any) =>
      op.type === 'payment' &&
      op.asset_code === USDC_ASSET_CODE &&
      op.to === expectedMerchantPublicKey
    );

    if (!usdcPayment) {
      return {
        valid: false,
        reason: `No USDC payment to merchant (${expectedMerchantPublicKey}) found in transaction operations`
      };
    }

    // 4. Validate amount within 1% tolerance (handles rounding)
    const paidAmount = parseFloat(usdcPayment.amount);
    const tolerance = expectedAmountUsdc * 0.01;
    if (Math.abs(paidAmount - expectedAmountUsdc) > tolerance) {
      return {
        valid: false,
        reason: `Amount mismatch: paid ${paidAmount} USDC, expected ${expectedAmountUsdc} USDC (±1% tolerance)`
      };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, reason: `Verification error: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// POST /api/soroban/confirm-first-payment
app.post('/api/soroban/confirm-first-payment', async (req, res) => {
  try {
    const { contratoId, txHash } = req.body;

    if (!contratoId || !txHash) {
      return res.status(400).json({ error: 'contratoId and txHash are required' });
    }

    const contract = contracts.find(c => c.id === contratoId);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // ─── SECURITY: Verify the USDC payment actually happened on-chain ───
    const expectedAmount = parseFloat(contract.installmentAmount) || (contract.totalAmount / contract.installmentsCount);
    const merchantKey = contract.merchantPublicKey || process.env.STELLAR_MERCHANT_PUBLIC || '';
    const verification = await verifyUsdcPaymentOnChain(txHash, merchantKey, expectedAmount);
    if (!verification.valid) {
      console.error(`[Security] Forged first-payment attempt on contract ${contratoId}: ${verification.reason}`);
      return res.status(402).json({ error: 'Payment verification failed', reason: verification.reason });
    }
    // ─────────────────────────────────────────────────

    console.log('\n======================================================')
    console.log(`⚓ [ETHERFUSE ANCHOR] PIX Confirmed! Emulating BRL -> USDC conversion...`);
    console.log(`🔗 [PROTOCOL x402] Routing ${contract.installmentAmount || 'USDC'} to Merchant Payment Pointer...`);
    console.log(`💰 [SETTLEMENT] Merchant (${contract.merchantPublicKey || 'SyloPay'}) received USDC via Anchor!`);
    console.log('======================================================\n');

    const updateResult = await sorobanService.finalizarPagamentoParcela(contratoId, 1, txHash);

    res.json({
      success: true,
      txHash: updateResult.txHash,
      explorerUrl: updateResult.explorerUrl,
      anchorMessage: `Etherfuse FX Anchor: PIX converted to USDC. Settled via x402 protocol.`
    });
  } catch (error) {
    console.error('[Route] /api/soroban/confirm-first-payment error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error confirming first payment' });
  }
});

// POST /api/soroban/confirm-payment
app.post('/api/soroban/confirm-payment', async (req, res) => {
  try {
    const { contratoId, numeroParcela, txHash } = req.body;

    if (!contratoId || !numeroParcela || !txHash) {
      return res.status(400).json({ error: 'contratoId, numeroParcela and txHash are required' });
    }

    const contract = contracts.find(c => c.id === contratoId);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // ─── SECURITY: Verify the USDC payment actually happened on-chain ───
    const expectedAmount = parseFloat(contract.installmentAmount) || (contract.totalAmount / contract.installmentsCount);
    const merchantKey = contract.merchantPublicKey || process.env.STELLAR_MERCHANT_PUBLIC || '';
    const verification = await verifyUsdcPaymentOnChain(txHash, merchantKey, expectedAmount);
    if (!verification.valid) {
      console.error(`[Security] Forged payment attempt on contract ${contratoId} parcela ${numeroParcela}: ${verification.reason}`);
      return res.status(402).json({ error: 'Payment verification failed', reason: verification.reason });
    }
    // ─────────────────────────────────────────────────

    const updateResult = await sorobanService.finalizarPagamentoParcela(contratoId, numeroParcela, txHash);

    res.json({
      success: true,
      txHash: updateResult.txHash,
      explorerUrl: updateResult.explorerUrl
    });
  } catch (error) {
    console.error('[Route] /api/soroban/confirm-payment error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error confirming payment' });
  }
});

// POST /api/soroban/prepare-payment
// Retorna XDR para pagar parcela on-chain via wallet
app.post('/api/soroban/prepare-payment', async (req, res) => {
  try {
    const { contratoId, numeroParcela, clientePublicKey } = req.body;
    const xdrData = await sorobanService.prepararTransacaoPagarParcela(
      contratoId,
      numeroParcela,
      clientePublicKey
    );
    // Retorna os dois XDRs
    res.json({ success: true, xdrPayment: xdrData.xdrPayment, xdrSoroban: xdrData.xdrSoroban });
  } catch (error) {
    console.error('[Route] /api/soroban/prepare-payment error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error preparing payment' });
  }
});

// POST /api/stellar/submit-payment
// Submete transação clássica (payment USDC) via Horizon
app.post('/api/stellar/submit-payment', async (req, res) => {
  try {
    let { signedXdr } = req.body;
    if (typeof signedXdr === 'object' && signedXdr.signedTxXdr) {
      signedXdr = signedXdr.signedTxXdr;
    }

    const innerTx = TransactionBuilder.fromXDR(signedXdr, 'Test SDF Network ; September 2015') as Transaction;

    let finalTx: any = innerTx;
    const masterSecret = process.env.STELLAR_MASTER_SECRET;
    if (masterSecret) {
      console.log('[Stellar] Sponsoring classic USDC payment transaction fee via Fee Bump!');
      const sponsorKeypair = Keypair.fromSecret(masterSecret);
      const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
        sponsorKeypair,
        '100000',
        innerTx,
        'Test SDF Network ; September 2015'
      );
      feeBumpTx.sign(sponsorKeypair);
      finalTx = feeBumpTx;
    }

    const response = await fetch(`${HORIZON_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ tx: finalTx.toXDR() }),
    });

    const data: any = await response.json();

    if (!response.ok) {
      // Loga o erro COMPLETO para diagnóstico
      console.error('[Stellar] tx_failed details:', JSON.stringify(data, null, 2));
      
      const resultCodes = data.extras?.result_codes;
      const txCode = resultCodes?.transaction || 'unknown';
      const opCodes = resultCodes?.operations?.join(', ') || 'none';
      
      throw new Error(`tx_failed | tx: ${txCode} | ops: ${opCodes}`);
    }

    res.json({
      success: true,
      txHash: data.hash,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${data.hash}`
    });
  } catch (error) {
    console.error('[Route] /api/stellar/submit-payment error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Payment submission failed' });
  }
});


// GET /api/soroban/contracts/cliente/:publicKey
// Lista contratos de um cliente
app.get('/api/soroban/contracts/cliente/:publicKey', async (req, res) => {
  try {
    const { publicKey } = req.params;

    // 1. Get contract IDs for this client from local database
    const localContractIds = contracts
      .filter(c => c.customerPublicKey === publicKey)
      .map(c => c.id);

    // If local database has no records for this client, fall back to checking on-chain directly
    let contractIds = localContractIds;
    if (contractIds.length === 0) {
      try {
        contractIds = await sorobanService.listarContratosCliente(publicKey);
      } catch (e) {
        console.warn('[Soroban] Failed to fetch on-chain contract IDs for client:', e);
      }
    }

    // 2. Fetch details for each contract ID found on-chain
    const onChainContracts = await Promise.all(
      contractIds.map(async (id) => {
        try {
          return await sorobanService.statusContrato(id);
        } catch (e) {
          console.warn(`[Soroban] Could not fetch details for contract ${id}:`, e);
          return null;
        }
      })
    );

    const validOnChain = onChainContracts.filter(c => c !== null);

    // 3. Fallback/Supplement with local data if on-chain is empty or for immediate feedback
    const localContracts = contracts.filter(c => c.customerPublicKey === publicKey);

    // Merge logic: prefer on-chain data if available, otherwise use local
    const mergedContratos = validOnChain.length > 0 ? validOnChain : localContracts;

    res.json({
      success: true,
      contracts: mergedContratos,
      source: validOnChain.length > 0 ? 'on-chain' : 'local'
    });
  } catch (error) {
    console.error('[Route] /api/soroban/contracts/cliente error:', error);
    // Even on error, try to return local contracts
    const localContracts = contracts.filter(c => c.customerPublicKey === req.params.publicKey);
    res.json({ success: true, contracts: localContracts, source: 'local-fallback', error: error instanceof Error ? error.message : 'Unknown' });
  }
});

app.post('/api/stellar/create-trustline', async (req, res) => {
  try {
    const { secretKey } = req.body;
    if (!secretKey) return res.status(400).json({ error: 'secretKey required' });

    const keypair = Keypair.fromSecret(secretKey);
    const horizonResponse = await fetch(`${HORIZON_URL}/accounts/${keypair.publicKey()}`);
    const accountData: any = await horizonResponse.json();

    const account = new Account(
      keypair.publicKey(), accountData.sequence
    );

    const USDC_ASSET = new Asset(
      'USDC',
      'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
    );

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.changeTrust({ asset: USDC_ASSET }))
      .setTimeout(30)
      .build();

    tx.sign(keypair);

    const submitRes = await fetch(`${HORIZON_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ tx: tx.toEnvelope().toXDR('base64') }),
    });

    const data: any = await submitRes.json();
    if (!submitRes.ok) throw new Error(JSON.stringify(data.extras?.result_codes));

    res.json({ success: true, txHash: data.hash });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Trustline failed' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// WEBHOOK ETHERFUSE
// ────────────────────────────────────────────────────────────────────────────

// POST /webhook/etherfuse
// Recebe eventos da Etherfuse (payment_received, order_completed)
app.post('/webhook/etherfuse', verifyEtherfuseWebhook, async (req, res) => {
  const event = req.body;
  console.log('[Webhook] Event received:', JSON.stringify(event, null, 2));

  try {
    const { type, data } = event;

    if (type === 'payment_received' || type === 'order_completed') {
      const { txHash, metadata } = data || {};

      // O frontend deve passar contratoId e numeroParcela como metadata ao criar a order
      const contratoId = metadata?.contratoId;
      const numeroParcela = metadata?.numeroParcela;

      if (contratoId && numeroParcela && txHash) {
        console.log(`[Webhook] Paying installment ${numeroParcela} of contract ${contratoId}`);
        await sorobanService.pagarParcela(contratoId, Number(numeroParcela), txHash);

        // Atualiza localmente também
        const contract = contracts.find(c => c.id === contratoId);
        if (contract && contract.installments[Number(numeroParcela) - 1]) {
          contract.installments[Number(numeroParcela) - 1].status = 'paid';
          contract.installments[Number(numeroParcela) - 1].txHash = txHash;
          contract.installments[Number(numeroParcela) - 1].paidAt = new Date().toISOString();
          saveContracts();
        }

        console.log(`[Webhook] ✅ Installment ${numeroParcela} paid on-chain`);
      } else {
        console.warn('[Webhook] Insufficient metadata to pay installment:', { contratoId, numeroParcela, txHash });
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

// Start server (only when running locally, not on Vercel serverless)
if (process.env.VERCEL !== '1') {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`SyloPay Backend (Hybrid) running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Stellar API: ${HORIZON_URL}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Soroban Contract: ${process.env.SOROBAN_CONTRACT_ID}`);
    console.log(`Etherfuse: ${process.env.ETHERFUSE_BASE_URL}`);
  });
}

export default app;