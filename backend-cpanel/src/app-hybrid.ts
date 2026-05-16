import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import * as etherfuseService from './services/etherfuse';
import * as sorobanService from './services/soroban';
import { Transaction, TransactionBuilder, rpc as SorobanRpc } from '@stellar/stellar-sdk';
import { verifyEtherfuseWebhook } from './middleware/webhookVerify';


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
        description: `${count}x of BRL ${installmentValue}`
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

// POST /api/etherfuse/order
// Cria uma ordem de pagamento (retorna chave Pix) com fallback para Sandbox
app.post('/api/etherfuse/order', async (req, res) => {
  const { quoteId } = req.body;
  if (!quoteId) return res.status(400).json({ error: 'quoteId required' });

  try {
    const order = await etherfuseService.criarOrderOnramp(quoteId);
    res.json({ success: true, order });
  } catch (error) {
    // Sandbox da Etherfuse exige proxy account (KYC) que não é viável em dev.
    // Retornamos uma ordem simulada para que o fluxo de demonstração funcione.
    console.warn('[Route] /api/etherfuse/order — Sandbox fallback enabled:', 
      error instanceof Error ? error.message : error);

    const sandboxOrder = {
      id: `sandbox-order-${Date.now()}`,
      quoteId,
      status: 'created',
      paymentInstructions: {
        pixKey: `00020126580014br.gov.bcb.pix0136${quoteId.replace(/-/g, '').slice(0,32)}5204000053039865802BR5913SyloPay Demo6009Sao Paulo62070503***6304${Math.floor(Math.random()*9999).toString().padStart(4,'0')}`,
        pixKeyType: 'random',
        amount: 100.00,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        bankName: 'Sandbox Bank (Demo)',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    res.json({ success: true, order: sandboxOrder, sandbox: true });
  }
});

// GET /api/etherfuse/order/:orderId
// Polling de status da ordem (com fallback para ordens de Sandbox)
app.get('/api/etherfuse/order/:orderId', async (req, res) => {
  const { orderId } = req.params;

  // Ordens geradas pelo fallback de Sandbox retornam "completed" diretamente
  if (orderId.startsWith('sandbox-order-')) {
    return res.json({
      success: true,
      order: {
        id: orderId,
        status: 'completed',
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
    const tx = TransactionBuilder.fromXDR(xdrString, 'Test SDF Network ; September 2015');
    
    const sendResult = await rpc.sendTransaction(tx);
    if (sendResult.status === 'ERROR') {
      throw new Error(`Error submitting signed tx: ${sendResult.errorResult}`);
    }

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
    const { signedXdr } = req.body;
    if (!signedXdr) return res.status(400).json({ error: 'signedXdr is required' });

    console.log('[Soroban] Tipo de signedXdr (tx):', typeof signedXdr);
    console.log('[Soroban] Conteúdo de signedXdr (tx):', JSON.stringify(signedXdr, null, 2));
    
    const xdrString = typeof signedXdr === 'string' ? signedXdr : (signedXdr as any).signedTxXdr || (signedXdr as any).signedXdr || (signedXdr as any).tx || (signedXdr as any).xdr;
    
    if (!xdrString || typeof xdrString !== 'string') {
        throw new Error('Invalid or missing signedXdr format.');
    }

    const rpc = new SorobanRpc.Server(process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org');
    const tx = TransactionBuilder.fromXDR(xdrString, 'Test SDF Network ; September 2015');
    
    const sendResult = await rpc.sendTransaction(tx);
    if (sendResult.status === 'ERROR') {
      throw new Error(`Error submitting tx: ${sendResult.errorResult}`);
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

// POST /api/soroban/confirm-first-payment
app.post('/api/soroban/confirm-first-payment', async (req, res) => {
  try {
    const { contratoId, txHash } = req.body;
    
    // Na demo, o orchestrator (backend) assina a transação de atualização de status
    // para facilitar o fluxo após o Pix ser confirmado
    const updateResult = await sorobanService.finalizarPagamentoParcela(
      contratoId,
      1, // Sempre a primeira parcela no checkout
      txHash
    );

    res.json({
      success: true,
      txHash: updateResult.txHash,
      explorerUrl: updateResult.explorerUrl
    });
  } catch (error) {
    console.error('[Route] /api/soroban/confirm-first-payment error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error confirming first payment' });
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
    res.json({ success: true, xdr: xdrData.xdr });
  } catch (error) {
    console.error('[Route] /api/soroban/prepare-payment error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error preparing payment' });
  }
});

// GET /api/soroban/contracts/cliente/:publicKey
// Lista contratos de um cliente
app.get('/api/soroban/contracts/cliente/:publicKey', async (req, res) => {
  try {
    const { publicKey } = req.params;
    
    // 1. Get IDs from chain
    const contractIds = await sorobanService.listarContratosCliente(publicKey);
    
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
      const contratoId    = metadata?.contratoId;
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