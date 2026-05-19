# SyloPay — Contexto do Projeto e Arquitetura do Sistema

O SyloPay é uma plataforma de **Buy Now, Pay Later (BNPL) descentralizada** construída na blockchain **Stellar** utilizando **Smart Contracts Soroban**. Ela permite que e-commerces ofereçam planos de parcelamento flexíveis e transparentes para seus clientes, enquanto recebem o valor total da venda instantaneamente. O ecossistema unifica o fluxo financeiro em USDC e liquidações/entradas baseadas em Pix (via âncoras sandbox).

---

## 🏗 Fluxo da Arquitetura do Sistema

O diagrama abaixo ilustra como o cliente, a carteira digital Freighter, o gateway backend e a rede de testes Stellar interagem:

```mermaid
graph TD
    Cliente[Navegador / Freighter] -->|1. Solicita Cotação| API[Express API Gateway]
    API -->|2. Consulta Taxas| Blend[(Pools do Blend Protocol)]
    Cliente -->|3. Assina XDR do Contrato| Soroban[(Contrato Soroban Rust)]
    Cliente -->|4. Entrada via Pix em BRL| Etherfuse[Âncora Pix Etherfuse]
    Etherfuse -->|5. Swap para USDC & Webhook| API
    API -->|6. Invoca pagar_parcela| Soroban
    Soroban -->|7. Emite Recibo On-chain| Cliente
```

---

## 🗂 Estrutura de Diretórios do Projeto

```
sylopay/
├── CONTEXT.md                   # Este arquivo de contexto detalhado
├── package.json                 # Scripts globais (setup, build, run)
├── docker-compose.yml           # Ambiente local PostgreSQL + Frontend + Backend
├── scripts/
│   ├── setup-stellar.js         # Utilitário para gerar keypairs de teste Stellar
│   ├── register-webhook.js      # Script de registro do webhook Etherfuse
│   └── test-webhook.js          # Simulador local para testes de webhook
│
├── frontend/                    # Aplicação React SPA (porta 3001)
│   ├── package.json
│   ├── vite.config.ts           # Configurações do Vite e proxy do /api
│   ├── vercel.json              # Regras de rewrite SPA para deploy na Vercel
│   └── src/
│       ├── App.tsx              # Router principal e rotas (/demo, /dashboard, etc.)
│       ├── hooks/useBNPL.tsx    # Contexto e gerenciamento global do checkout
│       ├── pages/               # CheckoutPage, QuotationPage, ContractPage, ProcessingPage, DashboardPage, DemoWalkthroughPage
│       ├── services/
│       │   ├── api.ts           # Cliente Axios padronizado para chamadas backend
│       │   └── pricingService.ts # Serviços de conversão de ativos e taxas DeFi
│       └── types/index.ts       # Definições de tipos e dados estáticos (produtos/demo)
│
├── backend-cpanel/              # Servidor Express Node.js (porta 3000)
│   ├── package.json
│   └── src/
│       ├── app-hybrid.ts        # Servidor principal ( Horizon Real + Soroban )
│       ├── app-lite.ts          # Modo sandbox com dados localmente mockados
│       ├── services/
│       │   ├── storage.ts       # Armazenamento e persistência local de contratos (contracts.json)
│       │   ├── soroban.ts       # Interações RPC com a Stellar SDK e chamadas do contrato
│       │   └── etherfuse.ts     # Integração direta com a API de Cotação/Ordem da Etherfuse
│       └── middleware/
│           └── webhookVerify.ts # Validação de assinaturas criptográficas HMAC para Webhooks
│
└── contracts/
    └── sylopay_bnpl/            # Código-fonte do Smart Contract em Rust
        ├── Cargo.toml
        └── src/lib.rs           # Lógica on-chain de empréstimo e liquidação
```

---

## 🛠 Stack Tecnológica Detalhada

*   **Frontend**: React 18, Vite 5, TypeScript, TailwindCSS, shadcn/ui.
*   **Backend**: Node.js, Express, TypeScript, ts-node.
*   **Smart Contracts**: Rust (`soroban-sdk v22`), Stellar CLI.
*   **Stablecoin**: USDC (Testnet).
*   **Orquestração/Gateway de Rampa**: Etherfuse FX API (Sandbox) + Webhooks HMAC.
*   **Conexão de Carteiras**: `@stellar/freighter-api` (Carteira digital Freighter).

---

## 📝 Smart Contract Soroban (Rust)

O contrato inteligente gerencia as regras de crédito, garante a custódia das parcelas e distribui as transações.

*   **ID do Contrato (Testnet)**: `CBY3H6BBUJ64H3QGSDMEQVZU3GKXV4WRE7V7X62PUFXNWYAHI4CCWTXH`
*   **Endereço do USDC (Testnet)**: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`

### Funções Exportadas do Contrato (`lib.rs`)
*   `initialize(admin: Address)`: Configura o administrador do contrato.
*   `criar_contrato(merchant: Address, cliente: Address, valor_total: u128, num_parcelas: u32) -> Symbol`: Cria e armazena os dados estruturados de um contrato BNPL on-chain.
*   `pagar_parcela(contrato_id: Symbol, numero: u32, tx_hash: Symbol)`: Marca uma parcela como liquidada no contrato inteligente.
*   `status_contrato(contrato_id: Symbol) -> Contrato`: Retorna o estado atualizado (Parcelas pagas, datas, valores).
*   `listar_contratos_cliente(cliente: Address) -> Vec<Symbol>`: Lista os IDs dos contratos ativos de um cliente.

---

## ⚡ Estrutura de Variáveis de Ambiente (`.env`)

Tanto no ambiente do backend quanto nos testes, as seguintes variáveis estruturam a comunicação com a blockchain Stellar:

```env
# Servidor
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# Rede Stellar & Horizon
STELLAR_NETWORK=TESTNET
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Credenciais e Contas
STELLAR_MERCHANT_PUBLIC=GD56ZNTTYAOKCBPRAGYI4OIEB44UTVVTOIW6TLVRMXIF7DP66E6WXUUV
STELLAR_CUSTOMER_PUBLIC=GBEZLV6PNNASOMQX6DUU67RH4VGJIM224PVPU36JNBATM773DXMVCYGV

# Credenciais da API Etherfuse (Sandbox)
ETHERFUSE_API_KEY=api_sand:059da7a3-...
ETHERFUSE_BASE_URL=https://api.sand.etherfuse.com
ETHERFUSE_WEBHOOK_SECRET=sua_assinatura_hmac

# Configurações do Contrato Soroban
SOROBAN_CONTRACT_ID=CBY3H6BBUJ64H3QGSDMEQVZU3GKXV4WRE7V7X62PUFXNWYAHI4CCWTXH
SOROBAN_ADMIN_SECRET=SAK3Y...
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

---

## 📡 Endpoints da API (backend-cpanel)

### Operações Gerais e Stellar
*   `GET /health`: Estado operacional e conexões da API.
*   `GET /api/stellar/health`: Status de sincronização com o Horizon da Stellar.
*   `POST /api/stellar/create-account`: Financia e ativa chaves públicas Stellar via Friendbot na Testnet.
*   `GET /api/stellar/account/:publicKey`: Retorna saldos (XLM/USDC) e estado da conta na blockchain.
*   `POST /api/stellar/create-trustline`: Configura dinamicamente a trustline do USDC no perfil da carteira.

### Cotações e Conversões (Etherfuse)
*   `POST /api/etherfuse/quote-onramp`: Solicita cotação e taxas da rampa Pix-para-USDC.
*   `POST /api/etherfuse/order`: Gera a ordem Pix e o QRCode Pix correspondente.
*   `GET /api/etherfuse/order/:id`: Consulta o status atual de uma ordem na rampa.

### Operações de Contratos (Soroban)
*   `POST /api/soroban/prepare-contract`: Retorna a transação XDR não assinada para o Freighter criar o contrato.
*   `POST /api/soroban/submit-contract`: Envia a transação assinada para a Testnet Stellar registrando o contrato on-chain.
*   `POST /api/soroban/prepare-payment`: Cria a transação XDR não assinada para pagamentos diretos de parcelas em USDC.
*   `POST /api/soroban/submit-transaction`: Submete parcelas liquidadas via Freighter na rede.
*   `GET /api/soroban/contracts/cliente/:publicKey`: Busca e combina contratos locais e on-chain de um cliente.

### Webhooks
*   `POST /webhook/etherfuse`: Rota segura (verificada via assinatura HMAC) que capta o depósito Pix, faz a rampa para USDC e aciona a chamada automática do contrato inteligente on-chain.

---

## 🎯 Integrações Avançadas e Diferenciais

1.  **Protocolo Blend**: Consultas de pools DeFi para retornar taxas de juros (APR) significativamente mais atrativas em tempo real no checkout comparadas aos cartões tradicionais.
2.  **Protocolo x402**: Suporte nativo ao protocolo Web Monetization. Permite a servidores terceiros e marketplaces consultar o Payment Pointer do merchant (`$stellar.sylopay.com/merchant-vault`) e faturas USDC de forma padronizada via HTTP 402.
3.  **DemoWalkthroughPage (Modo de Apresentação)**: Painel interativo isolado na rota `/demo` que simula com total realismo visual e funcional o fluxo de compra mesmo sob quedas parciais de conexões externas.

---

## 🚀 Como Rodar o Projeto Localmente

```bash
# Terminal 1 — Subir o Servidor Backend (Hybrid)
cd backend-cpanel
npm install
npm run dev:hybrid

# Terminal 2 — Subir o Servidor Frontend (React + Vite)
cd ../frontend
npm install
npm run dev
```
O frontend abrirá automaticamente em `http://localhost:3001`.
