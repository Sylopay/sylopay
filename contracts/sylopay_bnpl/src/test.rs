#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Env, String, Address};

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
    let (_env, client, _admin, merchant, cliente) = setup();
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
    let (_env, client, _admin, merchant, cliente) = setup();
    client.criar_contrato(&merchant, &cliente, &1_000_000, &2);
    client.criar_contrato(&merchant, &cliente, &2_000_000, &3);
    let lista = client.listar_contratos_cliente(&cliente);
    assert_eq!(lista.len(), 2);
}
