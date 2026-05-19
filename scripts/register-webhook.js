#!/usr/bin/env node
/**
 * scripts/register-webhook.js
 * Registra o endpoint do webhook na Etherfuse usando a URL do ngrok.
 *
 * Uso:
 *   node scripts/register-webhook.js <NGROK_URL>
 *
 * Exemplo:
 *   node scripts/register-webhook.js https://abc123.ngrok-free.app
 */

const { config } = require('dotenv');
const path = require('path');

// Carrega .env da raiz do projeto
config({ path: path.join(__dirname, '..', '.env') });

const API_KEY  = process.env.ETHERFUSE_API_KEY;
const BASE_URL = process.env.ETHERFUSE_BASE_URL || 'https://api.sand.etherfuse.com';

async function main() {
  const ngrokUrl = process.argv[2];

  if (!ngrokUrl) {
    console.error('❌ Uso: node scripts/register-webhook.js <NGROK_URL>');
    console.error('   Ex: node scripts/register-webhook.js https://abc123.ngrok-free.app');
    process.exit(1);
  }

  if (!API_KEY) {
    console.error('❌ ETHERFUSE_API_KEY não encontrada no .env');
    process.exit(1);
  }

  const webhookUrl = `${ngrokUrl.replace(/\/$/, '')}/webhook/etherfuse`;
  console.log(`\n🔗 Registrando webhook: ${webhookUrl}`);
  console.log(`🌐 API: ${BASE_URL}\n`);

  // Lista webhooks existentes
  console.log('📋 Verificando webhooks existentes...');
  const listRes = await fetch(`${BASE_URL}/ramp/webhook`, {
    headers: { Authorization: API_KEY },
  });

  if (listRes.ok) {
    const existing = await listRes.json();
    const webhooks = Array.isArray(existing) ? existing : existing.data || [];
    if (webhooks.length > 0) {
      console.log(`   Encontrados ${webhooks.length} webhook(s):`);
      webhooks.forEach(w => console.log(`   - ${w.id}: ${w.url}`));
    } else {
      console.log('   Nenhum webhook cadastrado ainda.');
    }
  }

  // Cria o novo webhook
  console.log('\n➕ Criando webhook...');
  const createRes = await fetch(`${BASE_URL}/ramp/webhook`, {
    method: 'POST',
    headers: {
      Authorization: API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: webhookUrl,
      events: ['order_completed', 'payment_received', 'order_failed'],
    }),
  });

  const data = await createRes.json();

  if (!createRes.ok) {
    console.error('❌ Erro ao criar webhook:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log('✅ Webhook criado com sucesso!');
  console.log(`   ID:     ${data.id}`);
  console.log(`   URL:    ${data.url}`);
  console.log(`   Events: ${(data.events || []).join(', ')}`);

  if (data.secret) {
    console.log(`\n🔐 WEBHOOK SECRET (salve no .env agora):`);
    console.log(`   ETHERFUSE_WEBHOOK_SECRET=${data.secret}`);
    console.log('\n⚠️  Essa chave só aparece UMA VEZ. Copie agora e adicione ao .env!');

    // Tenta salvar automaticamente no .env
    const fs = require('fs');
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = fs.readFileSync(envPath, 'utf-8');

    if (envContent.includes('ETHERFUSE_WEBHOOK_SECRET=')) {
      // Substitui linha existente
      envContent = envContent.replace(
        /ETHERFUSE_WEBHOOK_SECRET=.*/,
        `ETHERFUSE_WEBHOOK_SECRET=${data.secret}`
      );
    } else {
      // Adiciona após ETHERFUSE_BASE_URL
      envContent = envContent.replace(
        /ETHERFUSE_BASE_URL=.*/,
        `$&\nETHERFUSE_WEBHOOK_SECRET=${data.secret}`
      );
    }

    fs.writeFileSync(envPath, envContent);
    console.log('✅ ETHERFUSE_WEBHOOK_SECRET salvo automaticamente no .env raiz');

    // Salva também no backend-cpanel/.env
    const backendEnvPath = path.join(__dirname, '..', 'backend-cpanel', '.env');
    if (fs.existsSync(backendEnvPath)) {
      let backendEnv = fs.readFileSync(backendEnvPath, 'utf-8');
      if (backendEnv.includes('ETHERFUSE_WEBHOOK_SECRET=')) {
        backendEnv = backendEnv.replace(
          /ETHERFUSE_WEBHOOK_SECRET=.*/,
          `ETHERFUSE_WEBHOOK_SECRET=${data.secret}`
        );
      } else {
        backendEnv = backendEnv.replace(
          /ETHERFUSE_BASE_URL=.*/,
          `$&\nETHERFUSE_WEBHOOK_SECRET=${data.secret}`
        );
      }
      fs.writeFileSync(backendEnvPath, backendEnv);
      console.log('✅ ETHERFUSE_WEBHOOK_SECRET salvo automaticamente no backend-cpanel/.env');
    }
  } else {
    console.log('\n⚠️  API não retornou secret — sandbox pode não usar HMAC.');
  }

  console.log('\n🚀 Próximos passos:');
  console.log('   1. Reinicie o backend (Ctrl+C → npm run dev:hybrid)');
  console.log('   2. Acesse o frontend e faça uma compra de teste');
  console.log('   3. Simule o pagamento Pix no sandbox da Etherfuse');
  console.log(`   4. Veja os logs do backend para confirmar recebimento do webhook`);
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
