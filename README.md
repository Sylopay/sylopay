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

Scaffold a clean configuration profile from the template:

```bash
# Run in project root
cp .env.example .env
```

Open the newly created `.env` file and insert the active public/private keys and sandbox credentials.

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
[/quotation]  QuotationPage  → Installment quotes selection via DeFi (Blend pool APR)
[/contract]   ContractPage   → XDR Envelope signature using Freighter Wallet
[/processing] ProcessingPage → On-chain registration and Pix Sandbox QR Code generation
[/dashboard]  DashboardPage  → USDC fatura settlement and installments tracking
```

---

## 🧰 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, TypeScript 5, Tailwind CSS 3, Radix UI |
| **Backend** | Node.js, Express 4, TypeScript 5, ts-node, nodemon, Swagger UI |
| **Blockchain** | Stellar Testnet (Horizon REST API) |
| **Smart Contracts** | Soroban Rust SDK (`v22`), Cargo |
| **Wallet Integration** | `@stellar/freighter-api` (Freighter Wallet) |