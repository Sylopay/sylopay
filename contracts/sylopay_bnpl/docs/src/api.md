# Smart Contract Core API

All external endpoints are defined on the `SyloPayBNPL` contract and exposed in `lib.rs`:

## Core Mutating Functions

### `initialize(env: Env, admin: Address)`
Initializes the contract instance settings. Can only be executed once.
*   **Permissions**: Public but fails if already initialized.
*   **Actions**: Sets the Admin address and starts the global contract counter at `0`.

### `criar_contrato(env: Env, merchant: Address, cliente: Address, valor_total: i128, num_parcelas: u32) -> String`
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

### `pagar_parcela(env: Env, contrato_id: String, numero_parcela: u32, tx_hash: String)`
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

### `marcar_inadimplente(env: Env, contrato_id: String)`
Flags a contract as delinquent due to overdue payments.
*   **Permissions**: Fails if the contract `Admin` signature authorization (`require_auth()`) is missing.
*   **Actions**:
    *   Sets all missed installments to `Vencida`.
    *   Sets contract status to `Inadimplente`.
    *   Publishes a `BNPL_DEF` event.

---

## Read-Only Query Functions

### `status_contrato(env: Env, contrato_id: String) -> ContratoBNPL`
Returns the complete data struct for a specific contract.

### `listar_contratos_cliente(env: Env, cliente: Address) -> Vec<String>`
Returns a list of all contract IDs associated with a specific customer account.

### `obter_admin(env: Env) -> Address`
Returns the initialized contract administrator's address.

### `total_contratos(env: Env) -> u32`
Returns the total number of BNPL contracts registered on the platform.
