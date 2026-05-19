#!/usr/bin/env node

const StellarSdk = require('@stellar/stellar-sdk');
const fs = require('fs');
const path = require('path');

const SERVER = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

async function createAndFundAccount(name) {
  console.log(`\n🔄 Creating ${name} account...`);
  
  try {
    const keypair = StellarSdk.Keypair.random();
    
    // Fund account using Friendbot
    const response = await fetch(
      `https://friendbot.stellar.org?addr=${keypair.publicKey()}`
    );
    
    if (!response.ok) {
      throw new Error(`Friendbot failed: ${response.statusText}`);
    }
    
    // Wait for account to be available
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify account was created
    const account = await SERVER.loadAccount(keypair.publicKey());
    const balance = account.balances.find(b => b.asset_type === 'native')?.balance || '0';
    
    console.log(`✅ ${name} account created:`);
    console.log(`   Public Key: ${keypair.publicKey()}`);
    console.log(`   Balance: ${balance} XLM`);
    console.log(`   Explorer: https://stellar.expert/explorer/testnet/account/${keypair.publicKey()}`);
    
    return {
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret(),
      balance
    };
  } catch (error) {
    console.error(`❌ Failed to create ${name} account:`, error.message);
    throw error;
  }
}

async function updateEnvFile(accounts) {
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update environment variables
  envContent = envContent.replace(/STELLAR_MASTER_PUBLIC=.*/, `STELLAR_MASTER_PUBLIC=${accounts.master.publicKey}`);
  envContent = envContent.replace(/STELLAR_MASTER_SECRET=.*/, `STELLAR_MASTER_SECRET=${accounts.master.secretKey}`);
  envContent = envContent.replace(/STELLAR_MERCHANT_PUBLIC=.*/, `STELLAR_MERCHANT_PUBLIC=${accounts.merchant.publicKey}`);
  envContent = envContent.replace(/STELLAR_MERCHANT_SECRET=.*/, `STELLAR_MERCHANT_SECRET=${accounts.merchant.secretKey}`);
  envContent = envContent.replace(/STELLAR_CUSTOMER_PUBLIC=.*/, `STELLAR_CUSTOMER_PUBLIC=${accounts.customer.publicKey}`);
  envContent = envContent.replace(/STELLAR_CUSTOMER_SECRET=.*/, `STELLAR_CUSTOMER_SECRET=${accounts.customer.secretKey}`);
  
  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ Updated .env file with account details');
}

async function main() {
  console.log('🚀 Setting up Stellar Testnet accounts for Hackathon BNPL...\n');
  
  try {
    // Create accounts
    const master = await createAndFundAccount('Master');
    const merchant = await createAndFundAccount('Merchant Demo');
    const customer = await createAndFundAccount('Customer Demo');
    
    const accounts = { master, merchant, customer };
    
    // Update .env file
    await updateEnvFile(accounts);
    
    // Generate summary
    console.log('\n📊 SETUP COMPLETE - STELLAR ACCOUNTS CREATED');
    console.log('=' .repeat(60));
    console.log('✅ 3 accounts created and funded with 10,000 XLM each');
    console.log('✅ All accounts are verified and active on Stellar Testnet');
    console.log('✅ .env file updated with account credentials');
    console.log('✅ All transactions are verifiable on Stellar Explorer');
    
    console.log('\n🔗 Quick Verification Links:');
    console.log(`Master:   https://stellar.expert/explorer/testnet/account/${master.publicKey}`);
    console.log(`Merchant: https://stellar.expert/explorer/testnet/account/${merchant.publicKey}`);
    console.log(`Customer: https://stellar.expert/explorer/testnet/account/${customer.publicKey}`);
    
    console.log('\n🎯 Ready for Phase 2 Development!');
    console.log('Next: Start Docker services with "docker-compose up -d"');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}