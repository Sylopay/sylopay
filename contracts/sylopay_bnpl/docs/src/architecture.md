# Overview & Architecture

The SyloPay BNPL contract enables decentralized **Buy Now, Pay Later** credit terms directly on-chain using the Stellar Soroban network and USDC. It empowers merchants to offer structured installment payment plans to customers, securing agreements and enforcing transparent states directly via Soroban ledger storage.

## Modular Architecture
The contract is structured according to the industry's best-practice modular hierarchy to maximize readability, maintainability, and clean separation between test and production code:

```
sylopay_bnpl/
├── Cargo.toml            # Soroban SDK dependencies & compiler settings
└── src/
    ├── lib.rs            # Contract entrypoint, modules, and #[contractimpl] functions
    ├── types.rs          # Data types, Enums, and #[contracttype] storage models
    ├── utils.rs          # Shared utilities (format placeholders, helper math)
    └── test.rs           # Conditionally compiled #[cfg(test)] isolated tests
```

---

## Storage Strategy & Gas Optimization

Soroban uses state storage pricing based on three distinct storage classes. The SyloPay contract implements a hybrid model designed to minimize transaction gas fees:

| Storage Type | Purpose | Reason |
| :--- | :--- | :--- |
| **Instance Storage** | Global settings (Admin address, Contract counter) | Shared across all contract invocations; automatically loaded with the contract. |
| **Persistent Storage** | Full `ContratoBNPL` data models, and user lists (`ContratosCliente`) | Survives contract upgrades and instance lease cycles. Ensures contracts aren't deleted unless manually settled. |
