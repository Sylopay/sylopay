use soroban_sdk::{contracttype, Address, String, Vec};

#[derive(Debug, Clone, PartialEq)]
#[contracttype]
pub enum StatusParcela {
    Pendente,
    Paga,
    Vencida,
}

#[derive(Debug, Clone, PartialEq)]
#[contracttype]
pub enum StatusContrato {
    Ativo,
    Concluido,
    Inadimplente,
}

#[derive(Clone)]
#[contracttype]
pub struct Parcela {
    pub numero: u32,
    /// Valor em centavos de USDC (7 casas decimais — ex: 1_000_000 = 0.1 USDC)
    pub valor_usdc: i128,
    /// Unix timestamp de vencimento
    pub vencimento: u64,
    pub status: StatusParcela,
    pub tx_hash: String,
    pub pago_em: u64,
}

#[derive(Clone)]
#[contracttype]
pub struct ContratoBNPL {
    pub id: String,
    pub merchant: Address,
    pub cliente: Address,
    /// Valor total em centavos de USDC
    pub valor_total: i128,
    pub num_parcelas: u32,
    pub parcelas: Vec<Parcela>,
    pub status: StatusContrato,
    pub criado_em: u64,
}

// Chaves de armazenamento
#[contracttype]
pub enum ChaveStorage {
    Admin,
    Contrato(String),
    ContratosCliente(Address),
    ContadorContratos,
}
