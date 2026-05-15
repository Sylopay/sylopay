/**
 * soroban.ts
 * Serviço para invocar o contrato BNPL (Rust/Soroban) na Stellar Testnet
 * Contrato: CDJFOVTWLKX7EF7VSLRV5MYEHH2HS4T3QG6XKYHHOQXSS66QDNMYHWFG
 */

import {
  Contract,
  Keypair,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  xdr,
  Address,
} from '@stellar/stellar-sdk';

const CONTRACT_ID      = process.env.SOROBAN_CONTRACT_ID      || '';
const ADMIN_SECRET     = process.env.SOROBAN_ADMIN_SECRET      || '';
const RPC_URL          = process.env.SOROBAN_RPC_URL           || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.SOROBAN_NETWORK_PASSPHRASE || Networks.TESTNET;

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ContratoStatus {
  id: string;
  merchant: string;
  cliente: string;
  valorTotal: number;
  numParcelas: number;
  status: 'Ativo' | 'Concluido' | 'Inadimplente';
  criadoEm: number;
  parcelas: ParcelaStatus[];
}

export interface ParcelaStatus {
  numero: number;
  valorUsdc: number;
  vencimento: number;
  status: 'Pendente' | 'Paga' | 'Vencida';
  txHash: string;
  pagoEm: number;
}

// ─── Helper: RPC client ───────────────────────────────────────────────────────

function getRpc(): SorobanRpc.Server {
  return new SorobanRpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith('http://') });
}

function getAdminKeypair(): Keypair {
  if (!ADMIN_SECRET) throw new Error('SOROBAN_ADMIN_SECRET não configurada');
  return Keypair.fromSecret(ADMIN_SECRET);
}

// ─── Helper: submit de transação Soroban ─────────────────────────────────────

async function invokeContract(
  functionName: string,
  args: xdr.ScVal[]
): Promise<any> {
  const rpc     = getRpc();
  const admin   = getAdminKeypair();
  const contract = new Contract(CONTRACT_ID);

  const account = await rpc.getAccount(admin.publicKey());

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(functionName, ...args))
    .setTimeout(30)
    .build();

  // Simula primeiro
  const simResult = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulação falhou: ${simResult.error}`);
  }

  // Monta a transação com os recursos da simulação
  const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();
  preparedTx.sign(admin);

  // Submete
  const sendResult = await rpc.sendTransaction(preparedTx);
  if (sendResult.status === 'ERROR') {
    throw new Error(`Erro ao submeter tx: ${sendResult.errorResult}`);
  }

  // Aguarda confirmação
  let txResult = await rpc.getTransaction(sendResult.hash);
  let attempts = 0;
  while (
    txResult.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND &&
    attempts < 20
  ) {
    await new Promise(r => setTimeout(r, 1500));
    txResult = await rpc.getTransaction(sendResult.hash);
    attempts++;
  }

  if (txResult.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
    console.log(`[Soroban] ${functionName} ✅ txHash: ${sendResult.hash}`);
    return {
      txHash: sendResult.hash,
      result: txResult.returnValue ? scValToNative(txResult.returnValue) : null,
    };
  }

  throw new Error(`Transação falhou após ${attempts} tentativas. Status: ${txResult.status}`);
}

// ─── Funções do contrato ──────────────────────────────────────────────────────

/**
 * Cria um contrato BNPL on-chain
 * @param merchantPublicKey Endereço Stellar do comerciante
 * @param clientePublicKey  Endereço Stellar do cliente
 * @param valorTotalUsdc    Valor total em micro-USDC (7 casas — 1 USDC = 10_000_000)
 * @param numParcelas       Número de parcelas (1-12)
 */
export async function criarContratoBNPL(
  merchantPublicKey: string,
  clientePublicKey: string,
  valorTotalUsdc: number,
  numParcelas: number
): Promise<{ contratoId: string; txHash: string }> {
  console.log(`[Soroban] Criando contrato: ${merchantPublicKey} → ${clientePublicKey} | ${valorTotalUsdc} uUSDC x${numParcelas}`);

  const args = [
    new Address(merchantPublicKey).toScVal(),
    new Address(clientePublicKey).toScVal(),
    nativeToScVal(BigInt(valorTotalUsdc), { type: 'i128' }),
    nativeToScVal(numParcelas, { type: 'u32' }),
  ];

  const { txHash, result } = await invokeContract('criar_contrato', args);
  const contratoId = result as string;

  return { contratoId, txHash };
}

/**
 * Registra o pagamento de uma parcela on-chain
 * @param contratoId    ID do contrato BNPL
 * @param numeroParcela Número da parcela (1-based)
 * @param txHash        Hash da transação Etherfuse / Stellar
 */
export async function pagarParcela(
  contratoId: string,
  numeroParcela: number,
  txHash: string
): Promise<{ txHash: string }> {
  console.log(`[Soroban] Pagando parcela ${numeroParcela} do contrato ${contratoId}`);

  const args = [
    nativeToScVal(contratoId, { type: 'string' }),
    nativeToScVal(numeroParcela, { type: 'u32' }),
    nativeToScVal(txHash, { type: 'string' }),
  ];

  const result = await invokeContract('pagar_parcela', args);
  return { txHash: result.txHash };
}

/**
 * Consulta o status de um contrato (readonly — não gasta gas)
 */
export async function statusContrato(contratoId: string): Promise<ContratoStatus> {
  const rpc      = getRpc();
  const admin    = getAdminKeypair();
  const contract = new Contract(CONTRACT_ID);

  const account = await rpc.getAccount(admin.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'status_contrato',
        nativeToScVal(contratoId, { type: 'string' })
      )
    )
    .setTimeout(30)
    .build();

  const simResult = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Consulta falhou: ${simResult.error}`);
  }

  const raw = scValToNative((simResult as SorobanRpc.Api.SimulateTransactionSuccessResponse).result!.retval);
  return mapContratoStatus(raw);
}

/**
 * Lista os IDs de contratos de um cliente
 */
export async function listarContratosCliente(clientePublicKey: string): Promise<string[]> {
  const rpc      = getRpc();
  const admin    = getAdminKeypair();
  const contract = new Contract(CONTRACT_ID);

  const account = await rpc.getAccount(admin.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'listar_contratos_cliente',
        new Address(clientePublicKey).toScVal()
      )
    )
    .setTimeout(30)
    .build();

  const simResult = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Listagem falhou: ${simResult.error}`);
  }

  return scValToNative(
    (simResult as SorobanRpc.Api.SimulateTransactionSuccessResponse).result!.retval
  ) as string[];
}

// ─── Utilitário de mapeamento ─────────────────────────────────────────────────

function mapContratoStatus(raw: any): ContratoStatus {
  const statusMap: Record<string, ContratoStatus['status']> = {
    Ativo: 'Ativo',
    Concluido: 'Concluido',
    Inadimplente: 'Inadimplente',
  };
  const parcelaStatusMap: Record<string, ParcelaStatus['status']> = {
    Pendente: 'Pendente',
    Paga: 'Paga',
    Vencida: 'Vencida',
  };

  return {
    id: raw.id,
    merchant: raw.merchant,
    cliente: raw.cliente,
    valorTotal: Number(raw.valor_total),
    numParcelas: raw.num_parcelas,
    status: statusMap[raw.status] ?? 'Ativo',
    criadoEm: Number(raw.criado_em),
    parcelas: (raw.parcelas ?? []).map((p: any) => ({
      numero: p.numero,
      valorUsdc: Number(p.valor_usdc),
      vencimento: Number(p.vencimento),
      status: parcelaStatusMap[p.status] ?? 'Pendente',
      txHash: p.tx_hash ?? '',
      pagoEm: Number(p.pago_em),
    })),
  };
}
