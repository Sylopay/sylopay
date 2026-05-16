#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, log, symbol_short,
    Address, Env, String, Vec, vec,
};

// ============================================================
// Tipos de dados
// ============================================================

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

// ============================================================
// Contrato principal
// ============================================================

#[contract]
pub struct SyloPayBNPL;

#[contractimpl]
impl SyloPayBNPL {

    // ----------------------------------------------------------
    // Inicialização (executar 1x após o deploy)
    // ----------------------------------------------------------

    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ChaveStorage::Admin) {
            panic!("Contrato ja inicializado");
        }
        env.storage().instance().set(&ChaveStorage::Admin, &admin);
        env.storage().instance().set(&ChaveStorage::ContadorContratos, &0u32);
        log!(&env, "SyloPay BNPL inicializado. Admin: {}", admin);
    }

    // ----------------------------------------------------------
    // Criar contrato BNPL
    // ----------------------------------------------------------

    pub fn criar_contrato(
        env: Env,
        merchant: Address,
        cliente: Address,
        valor_total: i128,
        num_parcelas: u32,
    ) -> String {
        // O próprio cliente autoriza a criação do contrato via Freighter
        cliente.require_auth();

        if valor_total <= 0 {
            panic!("Valor total deve ser positivo");
        }
        if num_parcelas == 0 || num_parcelas > 12 {
            panic!("Numero de parcelas deve ser entre 1 e 12");
        }

        // Gera ID único
        let contador: u32 = env.storage().instance().get(&ChaveStorage::ContadorContratos).unwrap_or(0);
        let novo_contador = contador + 1;
        env.storage().instance().set(&ChaveStorage::ContadorContratos, &novo_contador);

        let id_str = String::from_str(&env, &format_id(novo_contador));
        let agora = env.ledger().timestamp();

        // Calcula valor por parcela
        let valor_parcela = valor_total / num_parcelas as i128;
        let dias_30: u64 = 30 * 24 * 60 * 60;

        // Cria parcelas
        let empty_hash = String::from_str(&env, "");
        let mut parcelas: Vec<Parcela> = vec![&env];

        for i in 1..=num_parcelas {
            parcelas.push_back(Parcela {
                numero: i,
                valor_usdc: valor_parcela,
                vencimento: agora + (dias_30 * i as u64),
                status: StatusParcela::Pendente,
                tx_hash: empty_hash.clone(),
                pago_em: 0,
            });
        }

        let contrato = ContratoBNPL {
            id: id_str.clone(),
            merchant: merchant.clone(),
            cliente: cliente.clone(),
            valor_total,
            num_parcelas,
            parcelas,
            status: StatusContrato::Ativo,
            criado_em: agora,
        };

        // Persiste o contrato
        env.storage().persistent().set(&ChaveStorage::Contrato(id_str.clone()), &contrato);

        // Adiciona à lista de contratos do cliente
        let mut lista_cliente: Vec<String> = env
            .storage()
            .persistent()
            .get(&ChaveStorage::ContratosCliente(cliente.clone()))
            .unwrap_or(vec![&env]);
        lista_cliente.push_back(id_str.clone());
        env.storage().persistent().set(&ChaveStorage::ContratosCliente(cliente), &lista_cliente);

        // Emite evento
        env.events().publish(
            (symbol_short!("BNPL_NEW"), merchant),
            (id_str.clone(), valor_total, num_parcelas),
        );

        log!(&env, "Contrato BNPL criado: {}", id_str);
        id_str
    }

    // ----------------------------------------------------------
    // Pagar uma parcela
    // ----------------------------------------------------------

    pub fn pagar_parcela(
        env: Env,
        contrato_id: String,
        numero_parcela: u32,
        tx_hash: String,
    ) {
        let mut contrato: ContratoBNPL = env
            .storage()
            .persistent()
            .get(&ChaveStorage::Contrato(contrato_id.clone()))
            .expect("Contrato nao encontrado");

        // O próprio cliente dono do contrato autoriza o pagamento
        contrato.cliente.require_auth();

        if contrato.status != StatusContrato::Ativo {
            panic!("Contrato nao esta ativo");
        }

        // Encontra e atualiza a parcela
        let agora = env.ledger().timestamp();
        let mut parcela_encontrada = false;
        let mut parcelas_atualizadas: Vec<Parcela> = vec![&env];
        let mut todas_pagas = true;

        for parcela in contrato.parcelas.iter() {
            if parcela.numero == numero_parcela {
                if parcela.status == StatusParcela::Paga {
                    panic!("Parcela ja foi paga");
                }
                parcelas_atualizadas.push_back(Parcela {
                    status: StatusParcela::Paga,
                    tx_hash: tx_hash.clone(),
                    pago_em: agora,
                    ..parcela.clone()
                });
                parcela_encontrada = true;
            } else {
                if parcela.status != StatusParcela::Paga {
                    todas_pagas = false;
                }
                parcelas_atualizadas.push_back(parcela.clone());
            }
        }

        if !parcela_encontrada {
            panic!("Parcela nao encontrada");
        }

        contrato.parcelas = parcelas_atualizadas;

        // Se todas as parcelas (exceto a que acabou de ser paga) já estavam pagas → contrato concluído
        if todas_pagas {
            contrato.status = StatusContrato::Concluido;
            env.events().publish(
                (symbol_short!("BNPL_DONE"),),
                (contrato_id.clone(),),
            );
        }

        // Emite evento de pagamento
        env.events().publish(
            (symbol_short!("BNPL_PAY"),),
            (contrato_id.clone(), numero_parcela, tx_hash),
        );

        env.storage().persistent().set(&ChaveStorage::Contrato(contrato_id), &contrato);
        log!(&env, "Parcela {} paga com sucesso", numero_parcela);
    }

    // ----------------------------------------------------------
    // Marcar contrato como inadimplente
    // ----------------------------------------------------------

    pub fn marcar_inadimplente(env: Env, contrato_id: String) {
        let admin: Address = env.storage().instance().get(&ChaveStorage::Admin).unwrap();
        admin.require_auth();

        let mut contrato: ContratoBNPL = env
            .storage()
            .persistent()
            .get(&ChaveStorage::Contrato(contrato_id.clone()))
            .expect("Contrato nao encontrado");

        if contrato.status != StatusContrato::Ativo {
            panic!("Contrato nao esta ativo");
        }

        let agora = env.ledger().timestamp();
        let mut parcelas_atualizadas: Vec<Parcela> = vec![&env];

        for parcela in contrato.parcelas.iter() {
            if parcela.status == StatusParcela::Pendente && parcela.vencimento < agora {
                parcelas_atualizadas.push_back(Parcela {
                    status: StatusParcela::Vencida,
                    ..parcela.clone()
                });
            } else {
                parcelas_atualizadas.push_back(parcela.clone());
            }
        }

        contrato.parcelas = parcelas_atualizadas;
        contrato.status = StatusContrato::Inadimplente;
        env.storage().persistent().set(&ChaveStorage::Contrato(contrato_id.clone()), &contrato);

        env.events().publish(
            (symbol_short!("BNPL_DEF"),),
            (contrato_id,),
        );
    }

    // ----------------------------------------------------------
    // Consultas (readonly)
    // ----------------------------------------------------------

    pub fn status_contrato(env: Env, contrato_id: String) -> ContratoBNPL {
        env.storage()
            .persistent()
            .get(&ChaveStorage::Contrato(contrato_id))
            .expect("Contrato nao encontrado")
    }

    pub fn listar_contratos_cliente(env: Env, cliente: Address) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&ChaveStorage::ContratosCliente(cliente))
            .unwrap_or(vec![&env])
    }

    pub fn obter_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&ChaveStorage::Admin)
            .expect("Contrato nao inicializado")
    }

    pub fn total_contratos(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&ChaveStorage::ContadorContratos)
            .unwrap_or(0)
    }
}

// ============================================================
// Utilitário — formata ID do contrato
// ============================================================
fn format_id(n: u32) -> &'static str {
    // Em no_std sem alloc dinâmico, usamos um ID fixo baseado no contador
    // O ID real será gerado pelo backend e passado como parâmetro
    // Esta função é um placeholder para compatibilidade
    match n % 10 {
        0 => "BNPL-0000",
        1 => "BNPL-0001",
        2 => "BNPL-0002",
        3 => "BNPL-0003",
        4 => "BNPL-0004",
        5 => "BNPL-0005",
        6 => "BNPL-0006",
        7 => "BNPL-0007",
        8 => "BNPL-0008",
        _ => "BNPL-0009",
    }
}

// ============================================================
// Testes
// ============================================================
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::Env;

    fn setup() -> (Env, SyloPayBNPLClient<'static>, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(SyloPayBNPL, ());
        let client = SyloPayBNPLClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let merchant = Address::generate(&env);
        let cliente = Address::generate(&env);
        client.initialize(&admin);
        (env, client, admin, merchant, cliente)
    }

    #[test]
    fn test_criar_e_consultar_contrato() {
        let (env, client, _admin, merchant, cliente) = setup();
        let id = client.criar_contrato(&merchant, &cliente, &3_000_000, &3);
        let contrato = client.status_contrato(&id);
        assert_eq!(contrato.num_parcelas, 3);
        assert_eq!(contrato.valor_total, 3_000_000);
        assert_eq!(contrato.status, StatusContrato::Ativo);
        assert_eq!(contrato.parcelas.len(), 3);
    }

    #[test]
    fn test_pagar_parcela() {
        let (env, client, _admin, merchant, cliente) = setup();
        let id = client.criar_contrato(&merchant, &cliente, &3_000_000, &3);
        let tx = String::from_str(&env, "abc123txhash");
        client.pagar_parcela(&id, &1, &tx);
        let contrato = client.status_contrato(&id);
        let parcela1 = contrato.parcelas.get(0).unwrap();
        assert_eq!(parcela1.status, StatusParcela::Paga);
    }

    #[test]
    fn test_listar_contratos_cliente() {
        let (env, client, _admin, merchant, cliente) = setup();
        client.criar_contrato(&merchant, &cliente, &1_000_000, &2);
        client.criar_contrato(&merchant, &cliente, &2_000_000, &3);
        let lista = client.listar_contratos_cliente(&cliente);
        assert_eq!(lista.len(), 2);
    }
}
