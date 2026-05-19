# SyloPay BNPL — Stellar Soroban Smart Contract Documentation

This document describes the design, architecture, and API endpoints of the **SyloPay BNPL** smart contract implemented in Rust on the Stellar Soroban network.

---

## 1. Overview & Architecture

The SyloPay BNPL contract enables decentralized **Buy Now, Pay Later** credit terms directly on-chain using the Stellar Soroban network and USDC. It empowers merchants to offer structured installment payment plans to customers, securing agreements and enforcing transparent states directly via Soroban ledger storage.

### Modular Architecture
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

## 2. Storage Strategy & Gas Optimization

Soroban uses state storage pricing based on three distinct storage classes. The SyloPay contract implements a hybrid model designed to minimize transaction gas fees:

| Storage Type | Purpose | Reason |
| :--- | :--- | :--- |
| **Instance Storage** | Global settings (Admin address, Contract counter) | Shared across all contract invocations; automatically loaded with the contract. |
| **Persistent Storage** | Full `ContratoBNPL` data models, and user lists (`ContratosCliente`) | Survives contract upgrades and instance lease cycles. Ensures contracts aren't deleted unless manually settled. |

---

## 3. Data Structures & Data Models

### 3.1 Status Enums
Enums represent the exact state machine of contracts and individual installments:

#### `StatusParcela` (Installment Status)
*   `Pendente`: Awaiting off-chain Pix settlement or on-chain USDC transfer.
*   `Paga`: Payment confirmed on-chain with a linked transaction hash.
*   `Vencida`: Installment missed the ledger timestamp deadline.

#### `StatusContrato` (Contract Status)
*   `Ativo`: The plan is ongoing and installments are being paid.
*   `Concluido`: All installments are paid; contract settled successfully.
*   `Inadimplente`: Customer missed a payment deadline; flagged by the administrator.

### 3.2 Structs
Production data types representing records inside storage:

#### `Parcela` (Installment Record)
```rust
pub struct Parcela {
    pub numero: u32,
    pub valor_usdc: i128,
    pub vencimento: u64,
    pub status: StatusParcela,
    pub tx_hash: String,
    pub pago_em: u64,
}
```

#### `ContratoBNPL` (Contract Record)
```rust
pub struct ContratoBNPL {
    pub id: String,
    pub merchant: Address,
    pub cliente: Address,
    pub valor_total: i128,
    pub num_parcelas: u32,
    pub parcelas: Vec<Parcela>,
    pub status: StatusContrato,
    pub criado_em: u64,
}
```

---

## 4. Smart Contract Core API

All external endpoints are defined on the `SyloPayBNPL` contract and exposed in `lib.rs`:

### 4.1 State Modifying Functions

#### `initialize(env: Env, admin: Address)`
Initializes the contract instance settings. Can only be executed once.
*   **Permissions**: Public but fails if already initialized.
*   **Actions**: Sets the Admin address and starts the global contract counter at `0`.

#### `criar_contrato(env: Env, merchant: Address, cliente: Address, valor_total: i128, num_parcelas: u32) -> String`
Registers a new BNPL contract on-chain.
*   **Permissions**: Fails if the `cliente` signature authorization (`require_auth()`) is missing.
*   **Validations**:
    *   `valor_total` must be positive.
    *   `num_parcelas` must be between `1` and `12` inclusive.
*   **Actions**:
    *   Increments the global contract counter.
    *   Generates a unique `id` (e.g., `"BNPL-0001"`).
    *   Calculates equal installment allocations and 30-day staggered deadlines.
    *   Publishes a `BNPL_NEW` event on-chain.
*   **Returns**: The generated `String` ID.

#### `pagar_parcela(env: Env, contrato_id: String, numero_parcela: u32, tx_hash: String)`
Processes payment validation for a specific installment.
*   **Permissions**: Fails if the `cliente` signature authorization (`require_auth()`) is missing.
*   **Validations**:
    *   Contract status must be `Ativo`.
    *   Installment number must exist and status must be `Pendente`.
*   **Actions**:
    *   Updates installment status to `Paga`.
    *   Saves the transaction hash and payment timestamp.
    *   If all installments are paid, sets contract status to `Concluido` and triggers a `BNPL_DONE` event.
    *   Publishes a `BNPL_PAY` event.

#### `marcar_inadimplente(env: Env, contrato_id: String)`
Flags a contract as delinquent due to overdue payments.
*   **Permissions**: Fails if the contract `Admin` signature authorization (`require_auth()`) is missing.
*   **Actions**:
    *   Sets all missed installments to `Vencida`.
    *   Sets contract status to `Inadimplente`.
    *   Publishes a `BNPL_DEF` event.

---

### 4.2 Read-Only Query Functions

#### `status_contrato(env: Env, contrato_id: String) -> ContratoBNPL`
Returns the complete data struct for a specific contract.

#### `listar_contratos_cliente(env: Env, cliente: Address) -> Vec<String>`
Returns a list of all contract IDs associated with a specific customer account.

#### `obter_admin(env: Env) -> Address`
Returns the initialized contract administrator's address.

#### `total_contratos(env: Env) -> u32`
Returns the total number of BNPL contracts registered on the platform.

---

## 5. Security & Authorization Matrix

| Function | Required Authorization | Enforcement Mechanism |
| :--- | :--- | :--- |
| `initialize` | None (One-time limit) | Checks instance storage for `ChaveStorage::Admin` presence |
| `criar_contrato` | `cliente` signature | Explicit `cliente.require_auth()` verification |
| `pagar_parcela` | `cliente` signature | Explicit `contrato.cliente.require_auth()` verification |
| `marcar_inadimplente` | `admin` signature | Explicit `admin.require_auth()` verification |
| `status_contrato` | Public | Read-only access |
| `listar_contratos_cliente`| Public | Read-only access |
