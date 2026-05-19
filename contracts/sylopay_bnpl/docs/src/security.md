# Security & Authorization Matrix

The matrix below defines the access control policies enforced at the smart contract level:

| Function | Required Authorization | Enforcement Mechanism |
| :--- | :--- | :--- |
| `initialize` | None (One-time limit) | Checks instance storage for `ChaveStorage::Admin` presence |
| `criar_contrato` | `cliente` signature | Explicit `cliente.require_auth()` verification |
| `pagar_parcela` | `cliente` signature | Explicit `contrato.cliente.require_auth()` verification |
| `marcar_inadimplente` | `admin` signature | Explicit `admin.require_auth()` verification |
| `status_contrato` | Public | Read-only access |
| `listar_contratos_cliente`| Public | Read-only access |
