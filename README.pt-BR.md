[Read in English / Leia em Inglês](README.md)

---

# SyloPay — BNPL na Stellar

> Solução descentralizada de **Compre Agora, Pague Depois** (BNPL) construída na rede Stellar com Smart Contracts Soroban, Portal de Especificações Docusaurus dinâmico e integração com Pix em ambiente sandbox.

---

## 📋 Visão Geral

SyloPay é um protocolo de checkout Buy Now, Pay Later (BNPL) que aproveita a blockchain **Stellar** para acordos de parcelamento transparentes e execução de pagamentos criptograficamente seguros. O workspace está estruturado da seguinte forma:

- **Frontend** — React + Vite + TypeScript (porta `3001`).
- **Backend** — Express + TypeScript, suportando dois modos de operação:
  - `app-lite.ts` → Demo com 100% dos dados mockados (sem dependência de serviços externos).
  - `app-hybrid.ts` → Integração real com nós do Stellar Horizon, contratos Soroban e liquidação de USDC on-chain (recomendado).
- **Smart Contracts** — Contratos modulares, sem comentários excessivos, compilados com o Stellar Soroban Rust SDK (`v22`).

---

## 🚀 Implantações em Produção

O ecossistema de checkout BNPL SyloPay está totalmente implantado e acessível:

*   **Web app Frontend**: [sylopay-bnpl.vercel.app](https://sylopay-bnpl.vercel.app)
*   **API REST Gateway (Backend)**: [backend-cpanel.vercel.app](https://backend-cpanel.vercel.app/health)
*   **Soroban Contract Explorer (Testnet)**: [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBY3H6BBUJ64H3QGSDMEQVZU3GKXV4WRE7V7X62PUFXNWYAHI4CCWTXH)

---

## 🗂 Estrutura de Diretórios

```
sylopay/
├── docs/                      # Portal de Especificação Técnica Docusaurus (React + TS)
├── frontend/                  # Single Page App React (Vite + TS + Tailwind)
│   ├── public/                # Assets públicos (imagens de alta resolução e logo oficial)
│   └── src/
│       ├── pages/             # CheckoutPage, QuotationPage, ContractPage, DashboardPage, etc.
│       ├── hooks/             # useBNPL (contexto de estado global do checkout)
│       └── components/        # Componentes de UI compartilhados
├── backend-cpanel/            # API Gateway Express (TypeScript)
│   └── src/
│       ├── app-lite.ts        # Modo demo mockado
│       ├── app-hybrid.ts      # Modo híbrido (integração Stellar Horizon + Soroban)
│       └── swagger.ts         # Especificações OpenAPI/Swagger
├── contracts/
│   └── sylopay_bnpl/          # Código fonte do Smart Contract Soroban em Rust
│       ├── src/
│       │   ├── lib.rs         # Ponto de entrada da implementação #[contractimpl]
│       │   ├── types.rs       # Structs, enums, e chaves #[contracttype]
│       │   ├── utils.rs       # Helpers compartilhados e geradores de ID
│       │   └── test.rs        # Testes unitários isolados #[cfg(test)]
│       └── docs/              # Guia digital interativo mdBook
├── scripts/                   # Utilitários de automação DevOps em CLI (JS/Shell)
│   ├── setup-stellar.js       # Helper para gerar keypairs da Testnet financiadas
│   ├── register-webhook.js    # Utilitário para registrar webhooks no sandbox da Etherfuse
│   └── test-webhook.js        # Simulador local de webhooks de pagamentos Pix
├── .env.example               # Modelos padronizados de variáveis de ambiente
└── package.json               # Scripts de desenvolvimento globais do workspace
```

---

## ⚡ Rodando Localmente (Modo Híbrido)

Esta é a configuração recomendada para experimentar a execução completa com blockchain.

### Pré-requisitos
*   **Node.js**: `18+`
*   **npm**: `9+`

---

### 1. Clonar e Instalar Dependências

```bash
# Instalar dependências do backend
cd backend-cpanel
npm install

# Instalar dependências do frontend
cd ../frontend
npm install
```

---

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na pasta `backend-cpanel` com as seguintes variáveis (veja `.env.example` para detalhes):

```env
STELLAR_NETWORK=TESTNET
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_MASTER_PUBLIC=GDQ6Y3...
STELLAR_MASTER_SECRET=SAK3YZ...
STELLAR_MERCHANT_PUBLIC=GD56ZN...
STELLAR_MERCHANT_SECRET=SA6TMU...
ETHERFUSE_API_KEY=api_sand:...
ETHERFUSE_BASE_URL=https://api.sand.etherfuse.com
SOROBAN_CONTRACT_ID=CBY3H6BBUJ64H3QGSDMEQVZU3GKXV4WRE7V7X62PUFXNWYAHI4CCWTXH
SOROBAN_ADMIN_SECRET=SDHCEC...
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
FRONTEND_URL=http://localhost:3001
```

---

### 3. Iniciar a API Backend

Inicie o servidor gateway híbrido conectado à Stellar Testnet:

```bash
cd backend-cpanel
npm run dev:hybrid
```

O servidor gateway será iniciado em **`http://localhost:3000`**.

---

### 4. Iniciar o App Frontend

Abra outra aba no terminal e execute:

```bash
cd frontend
npm run dev
```

O app React abrirá com hot-reloading em **`http://localhost:3001`**.

---

### 5. Verificar as Interfaces

```bash
# Status geral de saúde operacional da API
curl http://localhost:3000/health

# Verificação de saúde da conexão com o nó blockchain Horizon
curl http://localhost:3000/api/stellar/health
```

---

## 📚 Portais de Documentação Técnica

Oferecemos materiais robustos de especificação técnica para o ecossistema SyloPay:

### 1. Portal de Especificação Docusaurus (Site Local)
*   Um portal de documentação premium em React completo com diagramas Mermaid, sintaxe Dracula e barras laterais interativas.
*   Para iniciar o servidor Docusaurus localmente:
    ```bash
    cd docs
    npm start
    ```
    Abra seu navegador em **`http://localhost:3000`** para navegar.

### 2. mdBook Interativo em Rust
*   Um mdBook oficial em Rust detalhando os mapas de armazenamento de estado interno do smart contract, tipos e features do cargo.
*   Para servir o book localmente:
    ```bash
    cd contracts/sylopay_bnpl/docs
    ~/.cargo/bin/mdbook serve --open
    ```

### 3. Especificações Interativas da API (OpenAPI / Swagger)
*   O gateway do backend expõe um sandbox interativo da API para inspecionar e disparar chamadas ao vivo.
*   Certifique-se de que o backend está rodando e acesse: **`http://localhost:3000/api-docs`**.

### 4. PDFs Técnicos
*   **[`contracts/sylopay_bnpl/sylopay_bnpl_docs.pdf`](contracts/sylopay_bnpl/sylopay_bnpl_docs.pdf)**: PDF com a Especificação Técnica do Stellar Smart Contract.
*   **[`frontend/frontend_docs.pdf`](frontend/frontend_docs.pdf)**: PDF com a Especificação Técnica da UI e Design Tokens do React.

---

## 🔀 Pipeline Operacional de Checkout

```
[/]           CheckoutPage   → Seleção de itens do catálogo
[/quotation]  QuotationPage  → Seleção de planos de parcelamento (somente USDC) usando taxas APR do pool Blend
[/contract]   ContractPage   → Assinatura do XDR Envelope via Freighter Wallet (precificação USDC)
[/processing] ProcessingPage → Registro on-chain e geração de QR Code Pix Sandbox
[/dashboard]  DashboardPage  → Liquidação de faturas gasless em USDC e acompanhamento de parcelas
```

---

## 💎 Funcionalidades Principais do Protocolo

1.  **Precificação Somente em USDC**: Interface de moeda padronizada. Produtos precificados em BRL são convertidos automaticamente para USDC a uma taxa fixa (`5.7`) para garantir acordos estáveis em todas as páginas do checkout.
2.  **Modelo Transparente de Taxas**: Todas as taxas são aplicadas e exibidas claramente ao usuário em cada etapa:
    - **Taxa ao Consumidor**: `Blend borrow rate × 0.8 + 0.5%` de margem SyloPay (ex: Blend 2.3% → consumidor paga **2.34% APR**).
    - **Taxa Fixa da Plataforma**: `USDC 0.25` por contrato, mostrada como item separado no Resumo do Pedido.
    - **Taxa do Lojista (Merchant)**: `3.5%` da transação, cobrada do lojista (não do consumidor).
    - A `QuotationPage` e a `ContractPage` exibem: Preço do Produto → Taxa de Juros → Valor dos Juros → Taxa SyloPay → Cada Parcela → **Total que você vai pagar**.
3.  **Liquidação de Parcelas Gasless**: Modelo de patrocínio administrativo. O usuário paga apenas o principal da parcela em USDC. A taxa de rede Stellar (XLM) para as chamadas de `pagar_parcela` é coberta pela conta de admin do SyloPay (`admin.require_auth()`).
4.  **APR em Tempo Real do Protocolo Blend**: Inteligência de precificação ao vivo. O endpoint backend `/api/quotation` gera uma taxa de empréstimo Blend ao vivo (faixa de 1.5%–3.5%), aplica os 20% de desconto ao consumidor e a margem de 0.5% da SyloPay, e retorna `totalAmount` e `installmentAmount` já calculados com juros.
5.  **Guardião Freighter Wallet**: A `ContractPage` verifica a extensão Freighter no navegador assim que é montada via `isConnected()`. Se não instalada, o usuário é redirecionado automaticamente para [https://www.freighter.app](https://www.freighter.app) com uma tela de carregamento da marca — o usuário nunca vê uma interface de carteira quebrada.
6.  **Integração Etherfuse Sandbox**: Rampa BRL/Pix automatizada. O gateway provisiona uma conta bancária para cada cliente via `POST /ramp/bank-account` para gerar um `bankAccountId` válido antes de gerar o QR Code Pix.

---

## 🧰 Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, TypeScript 5, Tailwind CSS 3, Radix UI |
| **Backend** | Node.js, Express 4, TypeScript 5, ts-node, nodemon, Swagger UI |
| **Blockchain** | Stellar Testnet (Horizon REST API) |
| **Smart Contracts** | Soroban Rust SDK (`v22`), Cargo |
| **Integração de Wallet** | `@stellar/freighter-api` (Freighter Wallet) |
