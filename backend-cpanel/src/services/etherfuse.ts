/**
 * etherfuse.ts
 * Serviço de integração com a Etherfuse FX API (Sandbox)
 * Docs: https://docs.etherfuse.com
 */

const BASE_URL = process.env.ETHERFUSE_BASE_URL || 'https://api.sand.etherfuse.com';
const API_KEY  = process.env.ETHERFUSE_API_KEY  || '';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Quote {
  id: string;
  sourceAsset: string;
  targetAsset: string;
  sourceAmount: number;
  targetAmount: number;
  exchangeRate: number;
  expiresAt: string;
  customerId?: string;
  walletAddress?: string;
}

export interface Order {
  id: string;
  quoteId: string;
  status: 'created' | 'pending' | 'completed' | 'failed' | 'cancelled';
  // On-ramp: instruções de pagamento Pix
  paymentInstructions?: {
    pixKey?: string;
    pixKeyType?: string;
    amount?: number;
    expiresAt?: string;
    bankName?: string;
  };
  // Resultado da ordem
  txHash?: string;
  creditedAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  createdAt: string;
}

// ─── Helper de chamada HTTP ───────────────────────────────────────────────────

async function callEtherfuse<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: object
): Promise<T> {
  if (!API_KEY) {
    throw new Error('ETHERFUSE_API_KEY não configurada no .env');
  }

  const url = `${BASE_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': API_KEY,
      'Content-Type': 'application/json',
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`[Etherfuse] ${method} ${url}`);
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Etherfuse] Error ${response.status}: ${errorText}`);
    throw new Error(`Etherfuse API error ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

// ─── On-ramp: BRL → USDC ─────────────────────────────────────────────────────

/**
 * Cria uma cotação de on-ramp (BRL → USDC)
 * @param amountBRL Valor em BRL (ex: 150.00)
 * @param walletAddress Endereço Stellar do destinatário (G...)
 */
export async function criarQuoteOnramp(
  amountBRL: number,
  walletAddress: string
): Promise<Quote> {
  return callEtherfuse<Quote>('POST', '/ramp/quote', {
    sourceAsset: 'BRL',
    targetAsset: 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN', // USDC Stellar Testnet
    sourceAmount: amountBRL,
    walletAddress,
    blockchain: 'stellar',
  });
}

/**
 * Cria uma ordem de on-ramp a partir de uma quote
 * Retorna as instruções de pagamento Pix
 */
export async function criarOrderOnramp(quoteId: string): Promise<Order> {
  return callEtherfuse<Order>('POST', '/ramp/order', { quoteId });
}

/**
 * Busca o status de uma ordem
 */
export async function buscarOrder(orderId: string): Promise<Order> {
  return callEtherfuse<Order>('GET', `/ramp/order/${orderId}`);
}

// ─── Off-ramp: USDC → BRL ────────────────────────────────────────────────────

/**
 * Cria uma cotação de off-ramp (USDC → BRL)
 * @param amountUSDC Valor em USDC
 * @param bankAccountId ID da conta bancária cadastrada na Etherfuse
 */
export async function criarQuoteOfframp(
  amountUSDC: number,
  bankAccountId: string
): Promise<Quote> {
  return callEtherfuse<Quote>('POST', '/ramp/quote', {
    sourceAsset: 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    targetAsset: 'BRL',
    sourceAmount: amountUSDC,
    bankAccountId,
    blockchain: 'stellar',
  });
}

// ─── Webhooks ────────────────────────────────────────────────────────────────

/**
 * Registra um webhook para receber eventos da Etherfuse
 */
export async function registrarWebhook(url: string): Promise<Webhook> {
  return callEtherfuse<Webhook>('POST', '/ramp/webhook', {
    url,
    events: ['order_completed', 'payment_received', 'order_failed'],
  });
}

/**
 * Lista webhooks cadastrados
 */
export async function listarWebhooks(): Promise<Webhook[]> {
  return callEtherfuse<Webhook[]>('GET', '/ramp/webhook');
}

// ─── Ativos disponíveis ────────────────────────────────────────────────────

/**
 * Lista todos os ativos disponíveis para ramp na Stellar Testnet
 */
export async function listarAtivos() {
  return callEtherfuse<any>('GET', '/ramp/assets?blockchain=stellar');
}

// ─── Taxa de câmbio ───────────────────────────────────────────────────────────

/**
 * Retorna a taxa de câmbio atual BRL/USD (público, sem auth)
 */
export async function taxaCambio(): Promise<{ rate: number; currency: string }> {
  const response = await fetch(`${BASE_URL}/lookup/exchange-rates/BRL`);
  return response.json();
}
