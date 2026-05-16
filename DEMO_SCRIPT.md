# SyloPay BNPL MVP Demonstration Guide (Loom Script)

This script outlines a 3-5 minute demonstration of the SyloPay BNPL flow integrated with the Stellar Testnet and Etherfuse Anchor.

## 1. Introduction (30s)
- **Context**: Presenting SyloPay, a decentralized BNPL solution powered by Stellar and Soroban.
- **Objective**: Show the complete flow from product checkout to on-chain contract creation and first installment payment.
- **Setup**: Wallet (Freighter) connected to Stellar Testnet.

## 2. Product Selection & Quotation (45s)
- **Action**: Navigate to the **Samsung Galaxy S25 Ultra** checkout page.
- **Highlight**: The dynamic pricing powered by **Blend Protocol** (show the APR and pool utilization badges).
- **Action**: Click "Pay with SyloPay" and select a 3x or 4x installment plan.
- **Explanation**: Show the "Fee Transparency" breakdown, highlighting the low merchant fees compared to traditional BNPL.

## 3. On-chain Contract Creation (60s)
- **Action**: Fill in customer details and proceed to payment.
- **Highlight**: The **Freighter wallet popup** appearing to sign the `criar_contrato` transaction on Soroban.
- **Real-time Processing**: Show the step-by-step progress: "Creating on-chain contract" -> "Generating Pix Key".
- **Anchor Integration**: Explain that the Pix key is generated via **Etherfuse (Anchor)** to convert BRL to USDC automatically.

## 4. Payment & Dashboard (60s)
- **Action**: (Simulate) Scan the Pix QR Code. Once confirmed, show the redirection to the **Dashboard**.
- **Dashboard Features**: 
    - Show the **Active Contract** synced directly from the blockchain.
    - Highlight the status mapping (Pending/Paid) and currency (USDC).
- **Freighter Action**: Click **"Pay Now"** on the first installment.
- **Highlight**: Sign the payment transaction with Freighter. Show the status update to **"Paid"** once indexed.

## 5. Technical Evidence & Conclusion (30s)
- **Blockchain Evidence**: Click "View on Stellar Explorer" to show the contract and transaction hashes on Testnet.
- **Summary**: Emphasize the speed, transparency, and cost-efficiency of using Stellar for BNPL.
- **Closing**: "SyloPay: The future of consumer credit on-chain."

---

### Commits Information:
1. **feat: Integrate Soroban BNPL smart contract and Freighter wallet signing**
   - Link: `[Copy from GitHub after push]`
2. **feat: Standardize English localization and currency formatting (USDC/BRL)**
   - Link: `[Copy from GitHub after push]`
3. **fix: Improve dashboard synchronization with on-chain contract and detail fetching**
   - Link: `[Copy from GitHub after push]`
