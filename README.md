[🇺🇸 English](#english) | [🇧🇷 Português](#português)

---

<a id="english"></a>
# SyloPay — BNPL on Stellar

> Decentralized **Buy Now, Pay Later** solution built on Stellar with Soroban Smart Contracts, dynamic Docusaurus Specification Portal, and sandbox Pix on-ramp integration.

---

## 📋 Overview

SyloPay is a Buy Now, Pay Later (BNPL) checkout protocol leveraging the **Stellar** blockchain for transparent installment agreements and cryptographically secure payment execution. The workspace is structured as follows:

- **Frontend** — React + Vite + TypeScript (port `3001`).
- **Backend** — Express + TypeScript, supporting two operational modes:
  - `app-lite.ts` → 100% mocked data demo (zero external service dependencies).
  - `app-hybrid.ts` → Real-world integration with Stellar Horizon nodes, Soroban contracts, and on-chain USDC settlement (recommended).
- **Smart Contracts** — Modular, comment-free contracts compiled with the Stellar Soroban Rust SDK (`v22`).

---

## 🚀 Production Deployments

The SyloPay BNPL checkout ecosystem is fully deployed and accessible:

*   **Frontend web app**: [sylopay-bnpl.vercel.app](https://sylopay-bnpl.vercel.app)
*   **Backend gateway REST API**: [backend-cpanel.vercel.app](https://backend-cpanel.vercel.app/health)
*   **Soroban Contract Explorer (Testnet)**: [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBY3H6BBUJ64H3QGSDMEQVZU3GKXV4WRE7V7X62PUFXNWYAHI4CCWTXH)

---

## 🗂 Directory Structure

```
sylopay/
├── docs/                      # Docusaurus Technical Specification Portal (React + TS)
├── frontend/                  # React Single Page App (Vite + TS + Tailwind)
│   ├── public/                # Public assets (high-res images and official Logo)
│   └── src/
│       ├── pages/             # CheckoutPage, QuotationPage, ContractPage, DashboardPage, etc.
│       ├── hooks/             # useBNPL (global checkout state context)
│       └── components/        # Shared UI components
├── backend-cpanel/            # Express Gateway API (TypeScript)
│   └── src/
│       ├── app-lite.ts        # Mocked demo mode
│       ├── app-hybrid.ts      # Hybrid mode (Stellar Horizon + Soroban integration)
│       └── swagger.ts         # OpenAPI/Swagger specifications
├── contracts/
│   └── sylopay_bnpl/          # Soroban Smart Contract source code in Rust
│       ├── src/
│       │   ├── lib.rs         # Implementation entrypoint #[contractimpl]
│       │   ├── types.rs       # Structs, enums, and keys #[contracttype]
│       │   ├── utils.rs       # Shared helpers and ID generators
│       │   └── test.rs        # Isolated unit test suites #[cfg(test)]
│       └── docs/              # Interactive mdBook digital guide
├── scripts/                   # CLI DevOps automation utilities (JS/Shell)
│   ├── setup-stellar.js       # CLI helper to generate Testnet funding keypairs
│   ├── register-webhook.js    # Utility to register webhooks on Etherfuse sandbox
│   └── test-webhook.js        # Local Pix payment webhook simulator
├── .env.example               # Standard environment profiles templates
└── package.json               # Global workspace development scripts
```

---

## ⚡ Running Locally (Hybrid Mode)

This is the recommended setup to experience full real-world blockchain execution.

### Prerequisites
*   **Node.js**: `18+`
*   **npm**: `9+`

---

### 1. Clone and Install Dependencies

```bash
# Install backend dependencies
cd backend-cpanel
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

### 2. Configure Environment Variables

Create a `.env` file in the `backend-cpanel` folder with the following variables (see `.env.example` for details):

```env
STELLAR_NETWORK=TESTNET
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_MASTER_PUBLIC=GDQ6Y3...
STELLAR_MASTER_SECRET=SAK3YZ...
STELLAR_MERCHANT_PUBLIC=GD56ZN...
STELLAR_MERCHANT_SECRET=SA6TMU...
ETHERFUSE_API_KEY=api_sand:...
ETHERFUSE_BASE_URL=https://api.sand.etherfuse.com
SOROBAN_CONTRACT_ID=CBY3H6BBUJ64H3QGSDMEQVZU3GKXV4WRE7V7X62PUFXNWYAHI4CCWTXH
SOROBAN_ADMIN_SECRET=SDHCEC...
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
FRONTEND_URL=http://localhost:3001
```

---

### 3. Start the Backend API

Launch the hybrid gateway server connected to Stellar Testnet:

```bash
cd backend-cpanel
npm run dev:hybrid
```

The gateway server will spin up at **`http://localhost:3000`**.

---

### 4. Start the Frontend App

Open another terminal tab and run:

```bash
cd frontend
npm run dev
```

The React app will boot up hot-reloading at **`http://localhost:3001`**.

---

### 5. Verify the Interfaces

```bash
# General API operational health status
curl http://localhost:3000/health

# Connected Horizon blockchain node health check
curl http://localhost:3000/api/stellar/health
```

---

## 📚 Technical Documentation Portals

We offer robust, technical specification materials for the SyloPay ecosystem:

### 1. Docusaurus Technical Specification Portal (Local Website)
*   A premium React documentation portal complete with Mermaid diagrams, Dracula syntax highlighting, and interactive sidebars.
*   To start the Docusaurus server locally:
    ```bash
    cd docs
    npm start
    ```
    Open your browser at **`http://localhost:3000`** to browse.

### 2. Interactive Rust mdBook
*   An official Rust mdBook detailing smart contract internal state storage maps, types, and cargo features.
*   To serve the book locally:
    ```bash
    cd contracts/sylopay_bnpl/docs
    ~/.cargo/bin/mdbook serve --open
    ```

### 3. Interactive OpenAPI / Swagger Backend Specifications
*   The backend gateway exposes an interactive API sandbox to inspect and trigger live calls.
*   Ensure the backend is running and navigate to: **`http://localhost:3000/api-docs`**.

### 4. Technical PDFs
*   **[`contracts/sylopay_bnpl/sylopay_bnpl_docs.pdf`](contracts/sylopay_bnpl/sylopay_bnpl_docs.pdf)**: Stellar Smart Contract technical specification PDF.
*   **[`frontend/frontend_docs.pdf`](frontend/frontend_docs.pdf)**: React UI & Design Tokens technical specification PDF.

---

## 🔀 Checkout Operational Pipeline

```
[/]           CheckoutPage   → Catalog items selection
[/quotation]  QuotationPage  → Installment plans selection (USDC only) leveraging Blend pool APR rates
[/contract]   ContractPage   → XDR Envelope signature using Freighter Wallet (USDC pricing)
[/processing] ProcessingPage → On-chain registration and Pix Sandbox QR Code generation
[/dashboard]  DashboardPage  → Gasless USDC fatura settlement and installments tracking
```

---

## 💎 Core Protocol Features

1.  **USDC-Only Pricing**: Standardized currency interface. Products priced in BRL are automatically converted to USDC at a fixed rate (`5.7`) to ensure stable checkout agreements across all pages.
2.  **Transparent Fee Model**: All fees are applied and surfaced clearly to the user in every step of the checkout:
    - **Consumer Rate**: `Blend borrow rate × 0.8 + 0.5%` SyloPay margin (e.g. Blend 2.3% → consumer pays **2.34% APR**).
    - **Flat Platform Fee**: `USDC 0.25` per contract, shown as a separate line in the Order Summary.
    - **Merchant Fee**: `3.5%` of the transaction, charged to the merchant (not the consumer).
    - The `QuotationPage` and `ContractPage` both show: Product Price → Interest Rate → Interest Amount → SyloPay Fee → Each Payment → **Total You'll Pay**.
3.  **Gasless Installment Settlement**: Administrative sponsorship model. The user pays only the USDC installment principal. The Stellar network fee (XLM) for `pagar_parcela` calls is covered by the SyloPay admin account (`admin.require_auth()`).
4.  **Blend Protocol Live APR**: Real-time pricing intelligence. The `/api/quotation` backend endpoint generates a live Blend borrow rate (1.5%–3.5% range), applies the 20% consumer discount and the 0.5% SyloPay margin, and returns a correctly computed `totalAmount` and `installmentAmount` with interest already included.
5.  **Freighter Wallet Guard**: The `ContractPage` checks for the Freighter browser extension on mount via `isConnected()`. If not installed, the user is automatically redirected to [https://www.freighter.app](https://www.freighter.app) with a branded loading screen — no broken wallet UI is ever shown.
6.  **Etherfuse Sandbox Integration**: Automated BRL/Pix on-ramping. The gateway provisions a bank account for each customer via `POST /ramp/bank-account` to generate a valid `bankAccountId` before generating the Pix payment QR code.

---

## 🧰 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, TypeScript 5, Tailwind CSS 3, Radix UI |
| **Backend** | Node.js, Express 4, TypeScript 5, ts-node, nodemon, Swagger UI |
| **Blockchain** | Stellar Testnet (Horizon REST API) |
| **Smart Contracts** | Soroban Rust SDK (`v22`), Cargo |
| **Wallet Integration** | `@stellar/freighter-api` (Freighter Wallet) |

---
---

<a id="português"></a>
# SyloPay — BNPL na Stellar

> Solução descentralizada de **Compre Agora, Pague Depois** (BNPL) construída na rede Stellar com Smart Contracts Soroban, Portal de Especificações Docusaurus dinâmico e integração com Pix em ambiente sandbox.

---

## 📋 Visão Geral

SyloPay é um protocolo de checkout Buy Now, Pay Later (BNPL) que aproveita a blockchain **Stellar** para acordos de parcelamento transparentes e execução de pagamentos criptograficamente seguros. O workspace está estruturado da seguinte forma:

- **Frontend** — React + Vite + TypeScript (porta `3001`).
- **Backend** — Express + TypeScript, suportando dois modos de operação:
  - `app-lite.ts` → Demo com 100% dos dados mockados (sem dependência de serviços externos).
  - `app-hybrid.ts` → Integração real com nós do Stellar Horizon, contratos Soroban e liquidação de USDC on-chain (recomendado).
- **Smart Contracts** — Contratos modulares, sem comentários excessivos, compilados com o Stellar Soroban Rust SDK (`v22`).

---

## 🚀 Implantações em Produção

O ecossistema de checkout BNPL SyloPay está totalmente implantado e acessível:

*   **Web app Frontend**: [sylopay-bnpl.vercel.app](https://sylopay-bnpl.vercel.app)
*   **API REST Gateway (Backend)**: [backend-cpanel.vercel.app](https://backend-cpanel.vercel.app/health)
*   **Soroban Contract Explorer (Testnet)**: [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBY3H6BBUJ64H3QGSDMEQVZU3GKXV4WRE7V7X62PUFXNWYAHI4CCWTXH)

---

## 🗂 Estrutura de Diretórios

```
sylopay/
├── docs/                      # Portal de Especificação Técnica Docusaurus (React + TS)
├── frontend/                  # Single Page App React (Vite + TS + Tailwind)
│   ├── public/                # Assets públicos (imagens de alta resolução e logo oficial)
│   └── src/
│       ├── pages/             # CheckoutPage, QuotationPage, ContractPage, DashboardPage, etc.
│       ├── hooks/             # useBNPL (contexto de estado global do checkout)
│       └── components/        # Componentes de UI compartilhados
├── backend-cpanel/            # API Gateway Express (TypeScript)
│   └── src/
│       ├── app-lite.ts        # Modo demo mockado
│       ├── app-hybrid.ts      # Modo híbrido (integração Stellar Horizon + Soroban)
│       └── swagger.ts         # Especificações OpenAPI/Swagger
├── contracts/
│   └── sylopay_bnpl/          # Código fonte do Smart Contract Soroban em Rust
│       ├── src/
│       │   ├── lib.rs         # Ponto de entrada da implementação #[contractimpl]
│       │   ├── types.rs       # Structs, enums, e chaves #[contracttype]
│       │   ├── utils.rs       # Helpers compartilhados e geradores de ID
│       │   └── test.rs        # Testes unitários isolados #[cfg(test)]
│       └── docs/              # Guia digital interativo mdBook
├── scripts/                   # Utilitários de automação DevOps em CLI (JS/Shell)
│   ├── setup-stellar.js       # Helper para gerar keypairs da Testnet financiadas
│   ├── register-webhook.js    # Utilitário para registrar webhooks no sandbox da Etherfuse
│   └── test-webhook.js        # Simulador local de webhooks de pagamentos Pix
├── .env.example               # Modelos padronizados de variáveis de ambiente
└── package.json               # Scripts de desenvolvimento globais do workspace
```

---

## ⚡ Rodando Localmente (Modo Híbrido)

Esta é a configuração recomendada para experimentar a execução completa com blockchain.

### Pré-requisitos
*   **Node.js**: `18+`
*   **npm**: `9+`

---

### 1. Clonar e Instalar Dependências

```bash
# Instalar dependências do backend
cd backend-cpanel
npm install

# Instalar dependências do frontend
cd ../frontend
npm install
```

---

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na pasta `backend-cpanel` com as seguintes variáveis (veja `.env.example` para detalhes):

```env
STELLAR_NETWORK=TESTNET
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_MASTER_PUBLIC=GDQ6Y3...
STELLAR_MASTER_SECRET=SAK3YZ...
STELLAR_MERCHANT_PUBLIC=GD56ZN...
STELLAR_MERCHANT_SECRET=SA6TMU...
ETHERFUSE_API_KEY=api_sand:...
ETHERFUSE_BASE_URL=https://api.sand.etherfuse.com
SOROBAN_CONTRACT_ID=CBY3H6BBUJ64H3QGSDMEQVZU3GKXV4WRE7V7X62PUFXNWYAHI4CCWTXH
SOROBAN_ADMIN_SECRET=SDHCEC...
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
FRONTEND_URL=http://localhost:3001
```

---

### 3. Iniciar a API Backend

Inicie o servidor gateway híbrido conectado à Stellar Testnet:

```bash
cd backend-cpanel
npm run dev:hybrid
```

O servidor gateway será iniciado em **`http://localhost:3000`**.

---

### 4. Iniciar o App Frontend

Abra outra aba no terminal e execute:

```bash
cd frontend
npm run dev
```

O app React abrirá com hot-reloading em **`http://localhost:3001`**.

---

### 5. Verificar as Interfaces

```bash
# Status geral de saúde operacional da API
curl http://localhost:3000/health

# Verificação de saúde da conexão com o nó blockchain Horizon
curl http://localhost:3000/api/stellar/health
```

---

## 📚 Portais de Documentação Técnica

Oferecemos materiais robustos de especificação técnica para o ecossistema SyloPay:

### 1. Portal de Especificação Docusaurus (Site Local)
*   Um portal de documentação premium em React completo com diagramas Mermaid, sintaxe Dracula e barras laterais interativas.
*   Para iniciar o servidor Docusaurus localmente:
    ```bash
    cd docs
    npm start
    ```
    Abra seu navegador em **`http://localhost:3000`** para navegar.

### 2. mdBook Interativo em Rust
*   Um mdBook oficial em Rust detalhando os mapas de armazenamento de estado interno do smart contract, tipos e features do cargo.
*   Para servir o book localmente:
    ```bash
    cd contracts/sylopay_bnpl/docs
    ~/.cargo/bin/mdbook serve --open
    ```

### 3. Especificações Interativas da API (OpenAPI / Swagger)
*   O gateway do backend expõe um sandbox interativo da API para inspecionar e disparar chamadas ao vivo.
*   Certifique-se de que o backend está rodando e acesse: **`http://localhost:3000/api-docs`**.

### 4. PDFs Técnicos
*   **[`contracts/sylopay_bnpl/sylopay_bnpl_docs.pdf`](contracts/sylopay_bnpl/sylopay_bnpl_docs.pdf)**: PDF com a Especificação Técnica do Stellar Smart Contract.
*   **[`frontend/frontend_docs.pdf`](frontend/frontend_docs.pdf)**: PDF com a Especificação Técnica da UI e Design Tokens do React.

---

## 🔀 Pipeline Operacional de Checkout

```
[/]           CheckoutPage   → Seleção de itens do catálogo
[/quotation]  QuotationPage  → Seleção de planos de parcelamento (somente USDC) usando taxas APR do pool Blend
[/contract]   ContractPage   → Assinatura do XDR Envelope via Freighter Wallet (precificação USDC)
[/processing] ProcessingPage → Registro on-chain e geração de QR Code Pix Sandbox
[/dashboard]  DashboardPage  → Liquidação de faturas gasless em USDC e acompanhamento de parcelas
```

---

## 💎 Funcionalidades Principais do Protocolo

1.  **Precificação Somente em USDC**: Interface de moeda padronizada. Produtos precificados em BRL são convertidos automaticamente para USDC a uma taxa fixa (`5.7`) para garantir acordos estáveis em todas as páginas do checkout.
2.  **Modelo Transparente de Taxas**: Todas as taxas são aplicadas e exibidas claramente ao usuário em cada etapa:
    - **Taxa ao Consumidor**: `Blend borrow rate × 0.8 + 0.5%` de margem SyloPay (ex: Blend 2.3% → consumidor paga **2.34% APR**).
    - **Taxa Fixa da Plataforma**: `USDC 0.25` por contrato, mostrada como item separado no Resumo do Pedido.
    - **Taxa do Lojista (Merchant)**: `3.5%` da transação, cobrada do lojista (não do consumidor).
    - A `QuotationPage` e a `ContractPage` exibem: Preço do Produto → Taxa de Juros → Valor dos Juros → Taxa SyloPay → Cada Parcela → **Total que você vai pagar**.
3.  **Liquidação de Parcelas Gasless**: Modelo de patrocínio administrativo. O usuário paga apenas o principal da parcela em USDC. A taxa de rede Stellar (XLM) para as chamadas de `pagar_parcela` é coberta pela conta de admin do SyloPay (`admin.require_auth()`).
4.  **APR em Tempo Real do Protocolo Blend**: Inteligência de precificação ao vivo. O endpoint backend `/api/quotation` gera uma taxa de empréstimo Blend ao vivo (faixa de 1.5%–3.5%), aplica os 20% de desconto ao consumidor e a margem de 0.5% da SyloPay, e retorna `totalAmount` e `installmentAmount` já calculados com juros.
5.  **Guardião Freighter Wallet**: A `ContractPage` verifica a extensão Freighter no navegador assim que é montada via `isConnected()`. Se não instalada, o usuário é redirecionado automaticamente para [https://www.freighter.app](https://www.freighter.app) com uma tela de carregamento da marca — o usuário nunca vê uma interface de carteira quebrada.
6.  **Integração Etherfuse Sandbox**: Rampa BRL/Pix automatizada. O gateway provisiona uma conta bancária para cada cliente via `POST /ramp/bank-account` para gerar um `bankAccountId` válido antes de gerar o QR Code Pix.

---

## 🧰 Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, TypeScript 5, Tailwind CSS 3, Radix UI |
| **Backend** | Node.js, Express 4, TypeScript 5, ts-node, nodemon, Swagger UI |
| **Blockchain** | Stellar Testnet (Horizon REST API) |
| **Smart Contracts** | Soroban Rust SDK (`v22`), Cargo |
| **Integração de Wallet** | `@stellar/freighter-api` (Freighter Wallet) |