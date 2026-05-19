---
sidebar_position: 4
---

# React Frontend & Tailwind UI

This page documents the React SPA, custom hooks, and Tailwind CSS aesthetic style guide of the **SyloPay Frontend** application.

---

## 🗺️ Multi-Step Pages

*   **CheckoutPage (`/`)**: Displays items catalogs (e.g., Samsung Galaxy S25 Ultra) to begin the BNPL pipeline.
*   **QuotationPage (`/quotation`)**: Interative slider to choose credit terms (1-12 installments) and compare DeFi Blend APR.
*   **ContractPage (`/contract`)**: Captures customer personal info (e.g., PIX Pix key) and connects the **Freighter Wallet**.
*   **ProcessingPage (`/processing`)**: Visual loader for blockchain registration and generates the Pix sandboxed QR Code.
*   **DashboardPage (`/dashboard`)**: Customer dashboard to verify, track, and pay faturas using on-chain USDC.

---

## 🎛️ State Management (`useBNPL`)

Checkout state and blockchain responses are synchronized using a global React context hook (`useBNPL`):

```typescript
interface BNPLContextType {
  currentStep: 'checkout' | 'quotation' | 'contract' | 'processing' | 'dashboard';
  product: Product | null;
  selectedPlan: InstallmentPlan | null;
  personalInfo: PersonalInfo | null;
  contractId: string | null;
  walletAddress: string | null;
}
```

---

## 🎨 UI Design Tokens

*   **Dark Theme Accent**: Glowing Amber Orange (`#D97706`) paired with modern dark panels (`#0a0a0a` / `#121212`).
*   **Typography**: Outfitted Google Fonts and monospace formats.
*   **Animations**: Glowing glow transitions and micro-interactions for active elements.
