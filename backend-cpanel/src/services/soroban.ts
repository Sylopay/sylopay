/**
 * soroban.ts
 * Serviço para invocar o contrato BNPL (Rust/Soroban) na Stellar Testnet
 * Contrato: CDJFOVTWLKX7EF7VSLRV5MYEHH2HS4T3QG6XKYHHOQXSS66QDNMYHWFG
 */

import {
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  xdr,
  Address,
  rpc as SorobanRpc,
  Asset,
  Operation,
} from '@stellar/stellar-sdk';

// Exportando para uso em outros arquivos (ex: app-hybrid.ts)
export { rpc, TransactionBuilder, Transaction, Networks, scValToNative } from '@stellar/stellar-sdk';

// Helper para garantir que as variáveis de ambiente estão carregadas
const getEnv = (key: string, fallback: string): string => {
  return process.env[key] || fallback;
};

const getContractId = () => getEnv('SOROBAN_CONTRACT_ID', 'CBY3H6BBUJ64H3QGSDMEQVZU3GKXV4WRE7V7X62PUFXNWYAHI4CCWTXH');
const getRpcUrl = () => getEnv('SOROBAN_RPC_URL', 'https://soroban-testnet.stellar.org');
export const getNetworkPassphrase = () => getEnv('SOROBAN_NETWORK_PASSPHRASE', 'Test SDF Network ; September 2015');

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
  const url = getRpcUrl();
  return new SorobanRpc.Server(url, { allowHttp: url.startsWith('http://') });
}

function getAdminKeypair(): Keypair {
  const secret = getEnv('SOROBAN_ADMIN_SECRET', '');
  if (!secret) throw new Error('SOROBAN_ADMIN_SECRET não configurada');
  return Keypair.fromSecret(secret);
}

export function getAdminPublicKey(): string {
  return getAdminKeypair().publicKey();
}

// ─── Helper: submit de transação Soroban ─────────────────────────────────────

async function invokeContract(
  functionName: string,
  args: xdr.ScVal[]
): Promise<any> {
  const rpc     = getRpc();
  const admin   = getAdminKeypair();
  const contract = new Contract(getContractId());

  const account = await rpc.getAccount(admin.publicKey());

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
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
 * Prepara o XDR para criar um contrato BNPL on-chain
 * O usuário deverá assinar este XDR via Freighter
 */
export async function prepararTransacaoCriarContrato(
  merchantPublicKey: string,
  clientePublicKey: string,
  valorTotalUsdc: number,
  numParcelas: number
): Promise<{ xdr: string }> {
  const rpc = getRpc();
  const contract = new Contract(getContractId());
  
  // A conta de origem é a do cliente para que ele assine e pague a taxa
  const account = await rpc.getAccount(clientePublicKey);

  const args = [
    new Address(merchantPublicKey).toScVal(),
    new Address(clientePublicKey).toScVal(),
    nativeToScVal(BigInt(valorTotalUsdc), { type: 'i128' }),
    nativeToScVal(numParcelas, { type: 'u32' }),
  ];

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(contract.call('criar_contrato', ...args))
    .setTimeout(60)
    .build();

  // Simulação para preencher os recursos (footprint, CPU, etc)
  const simResult = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulação falhou: ${simResult.error}`);
  }

  const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();
  
  return { xdr: preparedTx.toXDR() };
}

/**
 * Cria um contrato BNPL on-chain (assinatura pelo ADMIN - legado/fallback)
 */
export async function criarContratoBNPL(
  merchantPublicKey: string,
  clientePublicKey: string,
  valorTotalUsdc: number,
  numParcelas: number
): Promise<{ contratoId: string; txHash: string }> {
  console.log(`[Soroban] Criando contrato (Admin): ${merchantPublicKey} → ${clientePublicKey} | ${valorTotalUsdc} uUSDC x${numParcelas}`);

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
 * Prepara o XDR para o usuário pagar uma parcela on-chain via Freighter
 */
export async function prepararTransacaoPagarParcela(
  contratoId: string,
  numeroParcela: number,
  clientePublicKey: string
): Promise<{ xdrPayment: string; xdrSoroban: string }> {
  const rpc = getRpc();
  const contract = new Contract(getContractId());

  // Busca info do contrato para saber merchant e valor
  const info = await statusContrato(contratoId);
  const parcela = info.parcelas.find(p => p.numero === numeroParcela);
  console.log('[Soroban] Merchant do contrato:', info.merchant);
  console.log('[Soroban] Valor parcela (stroops):', parcela?.valorUsdc);
  if (!parcela) throw new Error('Parcela nao encontrada');

  const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
  const USDC_ASSET = new Asset('USDC', USDC_ISSUER);
  const amountUsdc = (parcela.valorUsdc / 10_000_000).toFixed(7);

  // Busca conta uma vez — sequence number fresco
  const account = await rpc.getAccount(clientePublicKey);

  // ── TX 1: pagamento clássico USDC ──────────────────────────────────────────
  const paymentTx = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(Operation.payment({
      destination: info.merchant,
      asset: USDC_ASSET,
      amount: amountUsdc,
    }))
    .setTimeout(60)
    .build();

  // ── TX 2: chamada Soroban (sequence = account.sequence + 2) ────────────────
  // Incrementa manualmente o sequence para a segunda tx
  const account2 = await rpc.getAccount(clientePublicKey);
  // Força sequence number = sequence da tx1 + 1
  (account2 as any).incrementSequenceNumber();

  const args = [
    nativeToScVal(contratoId, { type: 'string' }),
    nativeToScVal(numeroParcela, { type: 'u32' }),
    nativeToScVal('', { type: 'string' }),
  ];

  const sorobanTx = new TransactionBuilder(account2, {
    fee: '1000000',
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(contract.call('pagar_parcela', ...args))
    .setTimeout(60)
    .build();

  const simResult = await rpc.simulateTransaction(sorobanTx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulação falhou: ${simResult.error}`);
  }

  const preparedSorobanTx = SorobanRpc.assembleTransaction(sorobanTx, simResult).build();

  

  return {
    xdrPayment: paymentTx.toXDR(),
    xdrSoroban: preparedSorobanTx.toXDR(),
  };
}



/**
 * Finaliza o pagamento de uma parcela (assinado pelo Orchestrator)
 * Usado após confirmação do Pix
 */
export async function finalizarPagamentoParcela(
  contratoId: string,
  numeroParcela: number,
  txHash: string
): Promise<{ txHash: string; explorerUrl: string }> {
  const rpc = getRpc();
  const admin = getAdminKeypair();
  const contract = new Contract(getContractId());
  const account = await rpc.getAccount(admin.publicKey());

  const args = [
    nativeToScVal(contratoId, { type: 'string' }),
    nativeToScVal(numeroParcela, { type: 'u32' }),
    nativeToScVal(txHash, { type: 'string' }),
  ];

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(contract.call('pagar_parcela', ...args))
    .setTimeout(60)
    .build();

  const simResult = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulação falhou: ${simResult.error}`);
  }

  const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();
  preparedTx.sign(admin);

  const sendResult = await rpc.sendTransaction(preparedTx);
  if ((sendResult.status as any) === 'PENDING' || (sendResult.status as any) === 'SUCCESS') {
    // Aguarda confirmação
    let txResult = await rpc.getTransaction(sendResult.hash);
    let retry = 0;
    while (txResult.status === 'NOT_FOUND' && retry < 10) {
      await new Promise(r => setTimeout(r, 1000));
      txResult = await rpc.getTransaction(sendResult.hash);
      retry++;
    }

    return {
      txHash: sendResult.hash,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${sendResult.hash}`
    };
  }

  throw new Error(`Erro ao enviar transação: ${sendResult.status}`);
}

/**
 * Consulta o status de um contrato (readonly — não gasta gas)
 */
export async function statusContrato(contratoId: string): Promise<ContratoStatus> {
  const rpc      = getRpc();
  const admin    = getAdminKeypair();
  const contract = new Contract(getContractId());

  const account = await rpc.getAccount(admin.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(
      contract.call(
        'status_contrato',
        nativeToScVal(contratoId, { type: 'string' })
      )
    )
    .setTimeout(60)
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
  const contract = new Contract(getContractId());

  const account = await rpc.getAccount(admin.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
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
    Ativo: 'Active' as any,
    Concluido: 'Completed' as any,
    Inadimplente: 'Overdue' as any,
  };
  const parcelaStatusMap: Record<string, ParcelaStatus['status']> = {
    Pendente: 'Pending' as any,
    Paga: 'Paid' as any,
    Vencida: 'Overdue' as any,
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
