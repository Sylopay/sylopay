# SyloPay — Contexto do Projeto para IAs

> Use este arquivo para dar contexto completo a qualquer IA sobre o estado atual do projeto.
> Atualizado em: Maio 2026

---

## O que é o SyloPay

Plataforma **BNPL (Buy Now, Pay Later) descentralizada** construída na blockchain **Stellar**.
- E-commerces oferecem parcelamento e recebem o valor integral na hora
- Consumidores parcelam sem cartão de crédito
- Toda a infraestrutura roda on-chain via **Soroban (contratos em Rust)**

**Contexto:** Projeto desenvolvido durante o Bootcamp Data · Stellar (Sprint 1, Maio 2026).

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite 5 + TypeScript + Tailwind CSS + Radix UI |
| Backend | Node.js + Express 4 + TypeScript (`backend-cpanel/`) |
| Blockchain | Stellar Testnet (Soroban) |
| Smart Contract | **Rust** via `soroban-sdk v22` |
| Stablecoin | USDC (Circle) |
| On-ramp/Off-ramp | **Etherfuse FX API** (Sandbox) |
| Wallet | Stellar Freighter API |

---

## Estrutura de Diretórios

```
sylopay/
├── frontend/                    # React app (porta 3001)
│   └── src/
│       ├── pages/               # CheckoutPage, QuotationPage, ContractPage,
│       │                        # ProcessingPage, DashboardPage
│       ├── hooks/useBNPL.tsx    # Contexto global do fluxo (React Context + useReducer)
│       ├── services/
│       │   ├── api.ts           # Chamadas REST ao backend
│       │   └── pricingService.ts # Modelo de precificação (Blend rates mockados)
│       └── types/index.ts       # Tipos TypeScript
│
├── backend-cpanel/              # Backend Express (porta 3000)
│   └── src/
│       ├── app-hybrid.ts        # Servidor principal (usar este para dev)
│       ├── app-lite.ts          # Versão 100% mockada (sem internet)
│       ├── services/
│       │   ├── etherfuse.ts     # ✅ NOVO — On-ramp/Off-ramp via Etherfuse API
│       │   └── soroban.ts       # ✅ NOVO — Invoca contrato Rust via stellar-sdk JS
│       └── middleware/
│           └── webhookVerify.ts # ✅ NOVO — Validação HMAC webhooks Etherfuse
│
├── contracts/
│   └── sylopay_bnpl/            # ✅ NOVO — Smart Contract em Rust (Soroban)
│       ├── Cargo.toml
│       └── src/lib.rs
│
└── scripts/
    └── setup-stellar.js         # Gera keypairs Stellar
```

---

## Fluxo do Usuário (5 passos)

```
/ (CheckoutPage)       → Produto + botão "Pay with SyloPay"
/quotation             → Escolhe número de parcelas (2x, 3x, 4x)
/contract              → Revisa e assina o contrato
/processing            → Pagamento Pix → registro on-chain Soroban
/dashboard             → Acompanha parcelas em tempo real
```

O estado global é gerenciado pelo hook `useBNPL` (React Context + useReducer).

---

## Smart Contract Soroban (Rust) — DEPLOYADO

**Contract ID (Testnet):**
```
CDJFOVTWLKX7EF7VSLRV5MYEHH2HS4T3QG6XKYHHOQXSS66QDNMYHWFG
```

**Explorer:**
https://stellar.expert/explorer/testnet/contract/CDJFOVTWLKX7EF7VSLRV5MYEHH2HS4T3QG6XKYHHOQXSS66QDNMYHWFG

**Funções exportadas:**

| Função | Quem chama | O que faz |
|--------|-----------|-----------|
| `initialize(admin)` | Admin (1x) | Inicializa o contrato |
| `criar_contrato(merchant, cliente, valor_total, num_parcelas)` | Backend | Cria contrato BNPL on-chain |
| `pagar_parcela(contrato_id, numero, tx_hash)` | Backend (webhook) | Registra pagamento de parcela |
| `status_contrato(contrato_id)` | Frontend/Backend | Lê estado do contrato (readonly) |
| `listar_contratos_cliente(cliente)` | Dashboard | Lista contratos de um endereço |
| `marcar_inadimplente(contrato_id)` | Admin | Marca contrato como inadimplente |
| `total_contratos()` | Qualquer | Contador de contratos criados |
| `obter_admin()` | Qualquer | Retorna endereço do admin |

**Eventos emitidos:**
- `BNPL_NEW` — ao criar contrato
- `BNPL_PAY` — ao pagar parcela
- `BNPL_DONE` — ao concluir todos os pagamentos
- `BNPL_DEF` — ao marcar inadimplente

**Build:**
```bash
cd contracts/sylopay_bnpl
stellar contract build
# → target/wasm32v1-none/release/sylopay_bnpl.wasm (11.5KB)
```

---

## Etherfuse — On-ramp / Off-ramp

**Documentação:** https://docs.etherfuse.com
**Sandbox:** https://devnet.etherfuse.com

**Fluxo on-ramp (BRL → USDC via Pix):**
1. `POST /api/etherfuse/quote-onramp` `{ amount_brl, wallet_address }`
2. `POST /api/etherfuse/order` `{ quoteId }` → retorna chave Pix + expiração
3. Usuário paga Pix no banco
4. Etherfuse detecta → envia webhook `POST /webhook/etherfuse`
5. Backend valida HMAC → invoca `pagar_parcela()` no contrato Soroban

**Autenticação Etherfuse:**
```
Header: Authorization: <api_key>   ← sem "Bearer"
```

**Sandbox API URL:** `https://api.sand.etherfuse.com`

---

## Variáveis de Ambiente (.env — NÃO commitar)

```env
# API
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# Stellar Testnet
STELLAR_NETWORK=TESTNET
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_MASTER_PUBLIC=GDQ6Y...
STELLAR_MASTER_SECRET=SAK3Y...
STELLAR_MERCHANT_PUBLIC=GCPY2...
STELLAR_MERCHANT_SECRET=SCQGG...
STELLAR_CUSTOMER_PUBLIC=GBEZL...
STELLAR_CUSTOMER_SECRET=SATT5...

# Etherfuse Sandbox
ETHERFUSE_API_KEY=api_sand:059da7a3-...:fe9688d0-...
ETHERFUSE_BASE_URL=https://api.sand.etherfuse.com
ETHERFUSE_WEBHOOK_SECRET=          # preencher ao registrar webhook

# Soroban Contract (Testnet)
SOROBAN_CONTRACT_ID=CDJFOVTWLKX7EF7VSLRV5MYEHH2HS4T3QG6XKYHHOQXSS66QDNMYHWFG
SOROBAN_ADMIN_SECRET=SDHCECF46GLTG53XFWXW4DESA4B7WWPI4PABLAHNVNMOEXUU7QZA4J66
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

---

## API Endpoints Disponíveis (backend-cpanel)

### Originais (mock)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check |
| GET | `/api/stellar/health` | Status Stellar |
| POST | `/api/quotation` | Opções de parcelamento |
| POST | `/api/contract` | Cria contrato (mock) |
| GET | `/api/contract/:id` | Busca contrato (mock) |
| POST | `/api/stellar/process-payment` | Paga parcela (mock) |

### Novos — Etherfuse
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/etherfuse/quote-onramp` | Cotação BRL→USDC |
| POST | `/api/etherfuse/order` | Cria ordem Pix |
| GET | `/api/etherfuse/order/:id` | Polling status ordem |
| GET | `/api/etherfuse/assets` | Lista ativos disponíveis |

### Novos — Soroban (on-chain)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/soroban/contract` | Cria contrato on-chain |
| GET | `/api/soroban/contract/:id` | Status do contrato on-chain |
| GET | `/api/soroban/contracts/cliente/:pubkey` | Contratos de um cliente |

### Webhook
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/webhook/etherfuse` | Recebe eventos Etherfuse (HMAC verificado) |

---

## Como Rodar Localmente

```bash
# Terminal 1 — Backend
cd backend-cpanel
npm install
npm run dev:hybrid      # porta 3000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev             # porta 3001
```

---

## O que falta implementar (Fase 3 e 4 do plano)

### Fase 3 — Frontend Pix
- [ ] Componente `PixPayment.tsx` (QR Code + countdown + polling)
- [ ] Atualizar `ProcessingPage.tsx` para usar `/api/etherfuse/quote-onramp`
- [ ] Atualizar `DashboardPage.tsx` para ler `/api/soroban/contract/:id`
- [ ] Instalar `qrcode.react` no frontend

### Fase 4 — Webhooks local
- [ ] Instalar e configurar `ngrok` para dev local
- [ ] Registrar webhook na Etherfuse via `/api/etherfuse` ou curl
- [ ] Salvar `ETHERFUSE_WEBHOOK_SECRET` no `.env`
- [ ] Testar fluxo completo sandbox: Pix simulado → webhook → Soroban

---

## Contas Stellar (Testnet)

**Admin do contrato Soroban:**
- Public: `stellar keys address sylopay_admin`
- Secret: `SDHCECF46GLTG53XFWXW4DESA4B7WWPI4PABLAHNVNMOEXUU7QZA4J66`
- Gerado com: `stellar keys generate sylopay_admin --network testnet --fund`

**Seed phrase (sylopay_admin):**
> budget accident beach fit beach fatal snack shaft voice explain valid swallow
> ribbon trumpet humor drink chunk estate soap weather photo convince toilet rescue

---

## Referências

| Recurso | Link |
|---------|------|
| Etherfuse Docs | https://docs.etherfuse.com |
| Etherfuse Sandbox | https://devnet.etherfuse.com |
| Stellar Docs | https://developers.stellar.org |
| Soroban SDK Rust | https://docs.rs/soroban-sdk/22.0.0 |
| Stellar CLI | https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli |
| Stellar Explorer (Testnet) | https://stellar.expert/explorer/testnet |
| Repositório de referência (Rust) | https://github.com/josiasdev/contrato_biblia |
