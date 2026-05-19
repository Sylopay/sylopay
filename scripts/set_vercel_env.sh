#!/bin/bash
PROJECT_DIR=$1
cd "$PROJECT_DIR" || exit 1

declare -A envs
envs[ETHERFUSE_API_KEY]="api_sand:059da7a3-56de-4165-9c6b-b3ecc63e8e59:fe9688d0-a935-4003-9e29-93588163ce95"
envs[ETHERFUSE_BASE_URL]="https://api.sand.etherfuse.com"
envs[STELLAR_NETWORK]="TESTNET"
envs[STELLAR_HORIZON_URL]="https://horizon-testnet.stellar.org"
envs[SOROBAN_CONTRACT_ID]="CBY3H6BBUJ64H3QGSDMEQVZU3GKXV4WRE7V7X62PUFXNWYAHI4CCWTXH"
envs[SOROBAN_RPC_URL]="https://soroban-testnet.stellar.org"
envs[SOROBAN_NETWORK_PASSPHRASE]="Test SDF Network ; September 2015"
envs[SOROBAN_ADMIN_SECRET]="SDHCECF46GLTG53XFWXW4DESA4B7WWPI4PABLAHNVNMOEXUU7QZA4J66"
envs[STELLAR_MERCHANT_PUBLIC]="GD56ZNTTYAOKCBPRAGYI4OIEB44UTVVTOIW6TLVRMXIF7DP66E6WXUUV"
envs[STELLAR_CUSTOMER_PUBLIC]="GBEZLV6PNNASOMQX6DUU67RH4VGJIM224PVPU36JNBATM773DXMVCYGV"

echo "Setting Vercel Env Variables for directory: $PROJECT_DIR"

for key in "${!envs[@]}"; do
  val="${envs[$key]}"
  echo "Adding $key..."
  vercel env add "$key" "production" --value "$val" -y --force
done

echo "Done!"
