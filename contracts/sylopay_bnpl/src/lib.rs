#![no_std]

mod types;
mod utils;

pub use types::{ChaveStorage, ContratoBNPL, Parcela, StatusContrato, StatusParcela};
pub use utils::format_id;

use soroban_sdk::{
    contract, contractimpl, log, symbol_short,
    Address, Env, String, Vec, vec,
};

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
// Testes
// ============================================================
#[cfg(test)]
mod test;
