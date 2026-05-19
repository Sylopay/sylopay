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
    pub valor_usdc: i128,
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
    pub valor_total: i128,
    pub num_parcelas: u32,
    pub parcelas: Vec<Parcela>,
    pub status: StatusContrato,
    pub criado_em: u64,
}

#[contracttype]
pub enum ChaveStorage {
    Admin,
    Contrato(String),
    ContratosCliente(Address),
    ContadorContratos,
}
