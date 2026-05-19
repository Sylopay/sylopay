# SyloPay Frontend — React & Tailwind UI Documentation

This document describes the design, architecture, global state management, and component systems of the **SyloPay Frontend** application, as well as the newly integrated **Docusaurus Specification Portal**.

---

## 1. Architecture & Core Pages

The SyloPay frontend is built as a Single Page Application (SPA) using React, Vite, TypeScript, and TailwindCSS. It implements a smooth, multi-step Buy Now, Pay Later checkout pipeline:

| Route | Page | Purpose |
| :--- | :--- | :--- |
| `/` | **CheckoutPage** | Product catalogs displaying premium items (e.g., Samsung Galaxy S25 Ultra) and checkout initiation. |
| `/quotation` | **QuotationPage** | Visual selection of credit terms, number of installments (1-12), and DeFi APR comparison. |
| `/contract` | **ContractPage** | Personal customer information capture (Pix/PIX rampa) and Freighter Wallet signature. |
| `/processing` | **ProcessingPage** | On-chain registration feedback loop, Pix sandboxed QR Code generation, and webhook listening. |
| `/dashboard` | **DashboardPage** | Customer's portal to track and settle upcoming installments directly using USDC on-chain. |

---

## 2. Global State Management (`useBNPL`)

A robust React Context hook (`useBNPL`) serves as the single source of truth, synchronizing checkout steps, product selections, user details, quote calculations, and Soroban contract states:

```typescript
interface BNPLContextType {
  currentStep: 'checkout' | 'quotation' | 'contract' | 'processing' | 'dashboard';
  product: Product | null;
  selectedPlan: InstallmentPlan | null;
  personalInfo: PersonalInfo | null;
  contractId: string | null;
  walletAddress: string | null;
  // State transitions and setters
  setProduct: (p: Product) => void;
  selectPlan: (plan: InstallmentPlan) => void;
  savePersonalInfo: (info: PersonalInfo) => void;
  setContractId: (id: string) => void;
  setWalletAddress: (address: string) => void;
  resetCheckout: () => void;
}
```

---

## 3. Core Component Library

### 3.1 Primary UI Components

#### `Button` (Action Control)
A robust button wrapping custom variations (`primary`, `secondary`, `outline`, `ghost`), fully styling disable states, and featuring integrated lucide `Loader2` spinners for blockchain transactions.

#### `ProgressBar` (Checkout Steps)
A dynamic, fully responsive visual stepper tracking `checkout` -> `quotation` -> `contract` -> `processing` -> `dashboard`. It highlights transitions using custom glowing orange dropshadows and completed icons.

#### `Logo` (Branding Representation)
Displays the official SyloPay typography and emblem using Vite public path assets (`/sylopay-logo.jpeg`).

#### `WalletConnector` (Stellar Web3 Integration)
Integrates `@stellar/freighter-api` to query user addresses, prompt signature authorization requests, and visually display connected public key representations.

#### `PricingCalculator` (Installment & DeFi comparison)
Provides a visual interactive slider showing cost allocations, on-chain fees, and comparing the total payments with traditional high-interest credit card APR.

#### `PixPayment` (On-Ramp Flow)
Generates the copy-paste Pix payment strings, sandboxed Pix QR Codes, and activates automated webhook polling intervals to verify when the user deposits Pix BRL.

---

## 4. UI Design System & Brand Aesthetics

SyloPay enforces a premium, dark-mode visual theme characterized by high-end typography and sleek shadows:

*   **Color Palette**:
    *   **Primary Accent**: Glowing Amber Orange (`text-orange-500`, `bg-orange-600`) representing blockchain energy.
    *   **Dark Slate**: Off-black gradients (`bg-[#0a0a0a]`, `bg-[#121212]`, `border-zinc-800`) to create glassmorphism panels.
    *   **Text Hierarchy**: Off-white high contrast (`text-zinc-100` / `text-zinc-300`) and low contrast muted elements (`text-zinc-600`).
*   **Animations**: Smooth transitions on tab switches, interactive hover states, and glowing outline animations for active choices.

---

## 5. Docusaurus Specification Portal

We have successfully integrated **Docusaurus** as our core developer specification documentation portal! Docusaurus provides a searchable, fast, and modern documentation website complete with interactive diagrams and clean UI.

### 📦 Key Portal Features:
*   **Auto-generated Navigation Sidebars**: Dynamic hierarchy tracking of all specs pages.
*   **Interactive Mermaid Diagrams**: Real-time rendering of payment gateways and contract operations.
*   **Dracula Syntax Highlighting**: Premium syntax formatting for Rust, TypeScript, and JSON.

### 🚀 Running Docusaurus Local Server:
To run the searchable Docusaurus documentation website locally:

```bash
cd docs
npm start
```

This starts the developer server at **`http://localhost:3000`** where the specifications can be navigated in a premium interactive interface.
