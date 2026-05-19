---
sidebar_position: 3
---

# Stellar Soroban Smart Contracts

The decentralized core of the **SyloPay BNPL** ecosystem is implemented in Rust on the Stellar Soroban network. It enforces transparent installment agreements and cryptographically secure payment execution.

---

## 🏗️ Modular Rust Structure

The contract is structured according to industry best practices to maximize safety and clean modular isolation:

*   **`lib.rs`**: Entrypoint exposing clean #[contractimpl] endpoints.
*   **`types.rs`**: Enums, keys, and storage models annotated with #[contracttype].
*   **`utils.rs`**: Shared format helper utilities.
*   **`test.rs`**: Conditionally compiled unit tests.

---

## 💾 Storage & Gas Optimization

Soroban utilizes state storage pricing. SyloPay implements a hybrid model to minimize transaction gas:

*   **Instance Storage**: Global settings (Administrator and Contract Counter).
*   **Persistent Storage**: Full `ContratoBNPL` data models, and user lists (`ContratosCliente`).

---

## 🔌 API Reference

### Mutating Endpoints

*   `initialize(env: Env, admin: Address)`: Configures the administrador and starts the counter.
*   `criar_contrato(env: Env, merchant: Address, cliente: Address, valor_total: i128, num_parcelas: u32) -> String`: Registers a new BNPL contract on-chain with 30-day staggered installment deadlines. Requires `cliente` signature.
*   `pagar_parcela(env: Env, contrato_id: String, numero_parcela: u32, tx_hash: String)`: Processes payment validation. Requires `cliente` signature.
*   `marcar_inadimplente(env: Env, contrato_id: String)`: Flags a contract as delinquent due to overdue payments. Requires `admin` signature.

### Read-Only Endpoints

*   `status_contrato(env: Env, contrato_id: String) -> ContratoBNPL`: Returns full contract record.
*   `listar_contratos_cliente(env: Env, cliente: Address) -> Vec<String>`: Returns a list of all contract IDs associated with the customer account.
*   `obter_admin(env: Env) -> Address`: Returns the initialized contract administrator's address.
*   `total_contratos(env: Env) -> u32`: Returns the total number of BNPL contracts registered.
