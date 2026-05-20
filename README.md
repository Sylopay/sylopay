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