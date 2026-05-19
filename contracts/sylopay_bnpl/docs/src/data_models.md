# Data Structures & Data Models

## Status Enums
Enums represent the exact state machine of contracts and individual installments:

### `StatusParcela` (Installment Status)
*   `Pendente`: Awaiting off-chain Pix settlement or on-chain USDC transfer.
*   `Paga`: Payment confirmed on-chain with a linked transaction hash.
*   `Vencida`: Installment missed the ledger timestamp deadline.

### `StatusContrato` (Contract Status)
*   `Ativo`: The plan is ongoing and installments are being paid.
*   `Concluido`: All installments are paid; contract settled successfully.
*   `Inadimplente`: Customer missed a payment deadline; flagged by the administrator.

---

## Structs
Production data types representing records inside storage:

### `Parcela` (Installment Record)
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

### `ContratoBNPL` (Contract Record)
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
