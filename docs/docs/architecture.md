---
sidebar_position: 2
---

# General System Architecture

The **SyloPay Buy Now, Pay Later** ecosystem integrates the following key architectural layers:

---

## 🏛️ Ecosystem Overview

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

## 📡 Gateway Server (Express CPanel)

The intermediate Express API acts as the bridge connecting the client to the blockchain and anchor rampa:

*   **Friendbot Creation**: Automatic funding of newly created Testnet wallets.
*   **Etherfuse SandBox Integration**: On-ramp and webhook listener that intercepts PIX payments, swaps BRL to USDC, and triggers on-chain payments.
*   **Soroban RPC Interceptor**: Encapsulates contract prepare-and-submit transactions.

---

## 🎯 Integrations

1.  **Blend DeFi Protocol**: Queries rates on-chain to display competitive installment APR.
2.  **x402 Protocol**: Native Payment Pointer integration for automated invoices.
