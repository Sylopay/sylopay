#!/usr/bin/env node
/**
 * scripts/test-webhook.js
 * Simula um evento "payment_received" da Etherfuse no backend local.
 * Sem dependências externas — usa apenas módulos nativos do Node.js.
 *
 * Uso:
 *   node scripts/test-webhook.js [CONTRATO_ID] [PARCELA]
 *
 * Exemplo:
 *   node scripts/test-webhook.js BNPL-0001 1
 */

const crypto = require('crypto');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');

// Lê .env manualmente (sem dotenv)
function readEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return fs.readFileSync(filePath, 'utf-8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .reduce((acc, l) => {
      const [k, ...v] = l.split('=');
      acc[k.trim()] = v.join('=').trim();
      return acc;
    }, {});
}

const envBackend = readEnv(path.join(__dirname, '..', 'backend-cpanel', '.env'));
const WEBHOOK_SECRET = envBackend.ETHERFUSE_WEBHOOK_SECRET || '';

async function simulateWebhook(contratoId, numeroParcela) {
  const txHash = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const payload = {
    type: 'payment_received',
    data: {
      orderId: `order_test_${Date.now()}`,
      txHash,
      status: 'completed',
      metadata: { contratoId, numeroParcela },
    },
    timestamp: new Date().toISOString(),
  };

  const body = JSON.stringify(payload);

  const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };

  if (WEBHOOK_SECRET) {
    const sig = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
    headers['x-etherfuse-signature'] = sig;
    console.log(`🔐 HMAC: ${sig.slice(0, 40)}...`);
  } else {
    console.warn('⚠️  ETHERFUSE_WEBHOOK_SECRET não configurado — sem HMAC (sandbox)');
  }

  console.log(`\n📤 POST http://localhost:3000/webhook/etherfuse`);
  console.log(`   Tipo:     payment_received`);
  console.log(`   Contrato: ${contratoId}`);
  console.log(`   Parcela:  ${numeroParcela}`);
  console.log(`   TxHash:   ${txHash}`);

  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: 'localhost', port: 3000, path: '/webhook/etherfuse', method: 'POST', headers },
      (res) => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            console.log(`\n✅ Resposta (${res.statusCode}):`, JSON.stringify(json, null, 2));
            if (json.received && !json.error) {
              console.log('\n🎉 Webhook processado com sucesso!');
              console.log('   Parcela deve aparecer como PAGA no dashboard em breve.');
              console.log(`   Stellar Explorer: https://stellar.expert/explorer/testnet`);
            } else if (json.error) {
              console.error('\n❌ Erro:', json.error);
            }
            resolve(json);
          } catch { resolve(data); }
        });
      }
    );
    req.on('error', (e) => {
      console.error('\n❌ Backend não está rodando:', e.message);
      reject(e);
    });
    req.write(body);
    req.end();
  });
}

const contratoId    = process.argv[2] || 'BNPL-0001';
const numeroParcela = parseInt(process.argv[3] || '1', 10);

simulateWebhook(contratoId, numeroParcela).catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
