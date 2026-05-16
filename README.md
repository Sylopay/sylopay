# SyloPay — BNPL on Stellar

> **Buy Now, Pay Later** descentralizado, construído na blockchain Stellar para o Hackathon.

---

## 📋 Visão Geral

O SyloPay é uma plataforma BNPL (Buy Now, Pay Later) que utiliza a blockchain **Stellar** para registro transparente de contratos e processamento de pagamentos parcelados. A aplicação é composta por:

- **Frontend** — React + Vite + TypeScript (porta `3001`)
- **Backend** — Express + TypeScript, em dois modos:
  - `app-lite.ts` → Dados 100% mockados (sem dependências externas)
  - `app-hybrid.ts` → Conecta à Stellar Horizon API real (recomendado)

---

## 🗂 Estrutura do Projeto

```
sylopay/
├── frontend/              # React app (Vite + TypeScript + Tailwind)
│   └── src/
│       ├── pages/         # CheckoutPage, QuotationPage, ContractPage,
│       │                  #   ProcessingPage, DashboardPage
│       ├── hooks/         # useBNPL (contexto global do fluxo)
│       ├── components/    # Componentes reutilizáveis
│       ├── services/      # Chamadas à API
│       └── types/         # Tipos TypeScript
├── backend-cpanel/        # Backend Express (TypeScript)
│   └── src/
│       ├── app-lite.ts    # Modo demo — tudo mockado
│       └── app-hybrid.ts  # Modo híbrido — integra com Stellar Testnet
├── scripts/
│   └── setup-stellar.js   # Script para gerar keypairs Stellar
├── docker-compose.yml     # PostgreSQL + Backend + Frontend via Docker
├── .env.example           # Variáveis de ambiente (raiz)
└── package.json           # Scripts raiz (setup, dev, build)
```

---

## ⚡ Rodando Localmente (modo rápido — sem Docker)

Esta é a forma mais simples de subir o projeto durante o desenvolvimento.

### Pré-requisitos

| Ferramenta | Versão mínima |
|------------|--------------|
| Node.js    | 18+          |
| npm        | 9+           |

---

### 1. Clone e instale as dependências

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd sylopay

# Instale as dependências do backend
cd backend-cpanel
npm install

# Instale as dependências do frontend
cd ../frontend
npm install
```

---

### 2. Configure as variáveis de ambiente

#### Backend (`backend-cpanel/.env`)

Copie o exemplo e ajuste conforme necessário:

```bash
cd backend-cpanel
cp .env.example .env
```

Conteúdo do `.env`:

```env
NODE_ENV=development
PORT=3000
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK=TESTNET
FRONTEND_URL=http://localhost:3001
```

#### Frontend

O frontend já está configurado via `vite.config.ts` para fazer proxy das chamadas `/api` para `http://localhost:3000`. **Nenhuma configuração extra é necessária.**

---

### 3. Suba o Backend

Abra um terminal e execute **um** dos modos abaixo:

#### Modo Híbrido *(recomendado — conecta à Stellar Testnet)*

```bash
cd backend-cpanel
npm run dev:hybrid
```

#### Modo Lite *(100% mockado — sem internet necessária)*

```bash
cd backend-cpanel
npm run dev
```

O servidor sobe em **http://localhost:3000**.

---

### 4. Suba o Frontend

Em outro terminal:

```bash
cd frontend
npm run dev
```

O app abre em **http://localhost:3001**.

---

### 5. Verifique os serviços

```bash
# Saúde geral da API
curl http://localhost:3000/health

# Conexão com a rede Stellar
curl http://localhost:3000/api/stellar/health
```

Resposta esperada (modo híbrido):

```json
{
  "connected": true,
  "network": "TESTNET",
  "latestLedger": 12345678,
  "horizonUrl": "https://horizon-testnet.stellar.org"
}
```

---

## 🐳 Rodando com Docker Compose *(opcional)*

> Requer Docker e Docker Compose instalados.

```bash
# Na raiz do projeto
docker-compose up -d
```

Serviços disponíveis:

| Serviço    | URL                   |
|------------|-----------------------|
| Frontend   | http://localhost:3001 |
| Backend    | http://localhost:3000 |
| PostgreSQL | localhost:5432        |

Para derrubar tudo:

```bash
docker-compose down -v
```

---

## 🔀 Fluxo da Aplicação

```
[/]           CheckoutPage   → Dados do produto e cliente
[/quotation]  QuotationPage  → Escolha do número de parcelas
[/contract]   ContractPage   → Revisão e assinatura do contrato
[/processing] ProcessingPage → Registro na blockchain Stellar
[/dashboard]  DashboardPage  → Acompanhamento das parcelas
```

O estado global do fluxo é gerenciado pelo hook `useBNPL` (React Context).

---

## 🌐 Endpoints da API

| Método | Endpoint                              | Descrição                          |
|--------|---------------------------------------|------------------------------------|
| GET    | `/health`                             | Health check da API                |
| GET    | `/api/stellar/health`                 | Status da conexão com Stellar      |
| POST   | `/api/stellar/create-account`         | Cria/simula uma conta Stellar      |
| GET    | `/api/stellar/account/:publicKey`     | Info da conta na Stellar           |
| POST   | `/api/quotation`                      | Gera opções de parcelamento        |
| POST   | `/api/contract`                       | Cria um contrato BNPL              |
| GET    | `/api/contract/:id`                   | Busca contrato por ID              |
| GET    | `/api/contracts`                      | Lista todos os contratos           |
| POST   | `/api/stellar/process-payment`        | Processa pagamento de uma parcela  |
| GET    | `/api/stellar/transactions/:accountId`| Histórico de transações            |

---

## 🛠 Scripts Disponíveis

### Raiz do projeto

```bash
npm run dev:backend   # Sobe o backend (modo lite)
npm run dev:frontend  # Sobe o frontend
```

### `backend-cpanel/`

```bash
npm run dev          # Modo lite (dados mockados)
npm run dev:hybrid   # Modo híbrido (Stellar Testnet real)
npm run build        # Compila TypeScript para dist/
npm start            # Executa o build compilado
```

### `frontend/`

```bash
npm run dev      # Servidor de desenvolvimento (porta 3001)
npm run build    # Build de produção
npm run preview  # Preview do build de produção
```

---

## 🔑 Gerando Keypairs Stellar (Testnet)

Para criar contas de teste na rede Stellar Testnet:

```bash
# Na raiz do projeto
node scripts/setup-stellar.js
```

As chaves geradas devem ser adicionadas ao arquivo `.env` (raiz):

```env
STELLAR_MASTER_PUBLIC=G...
STELLAR_MASTER_SECRET=S...
STELLAR_MERCHANT_PUBLIC=G...
STELLAR_MERCHANT_SECRET=S...
STELLAR_CUSTOMER_PUBLIC=G...
STELLAR_CUSTOMER_SECRET=S...
```

> ⚠️ **Nunca commite chaves reais.** O `.gitignore` já exclui arquivos `.env`.

---

## 🧰 Stack Tecnológica

| Camada     | Tecnologia                                                  |
|------------|-------------------------------------------------------------|
| Frontend   | React 18, Vite 5, TypeScript 5, Tailwind CSS 3, Radix UI    |
| Backend    | Node.js, Express 4, TypeScript 5, ts-node, nodemon          |
| Blockchain | Stellar Testnet (Horizon REST API)                          |
| Wallet     | Stellar Freighter API                                       |
| Docker     | PostgreSQL 15, Docker Compose                               |

---

## ❓ Solução de Problemas

### Porta já em uso

```bash
# Verifica o que está usando a porta 3000
lsof -i :3000
# ou
fuser -k 3000/tcp
```

### Erro de CORS no frontend

Confirme que o backend está rodando em `http://localhost:3000`. O proxy do Vite (`vite.config.ts`) redireciona automaticamente as chamadas `/api` para lá.

### `ts-node` ou `nodemon` não encontrado

```bash
cd backend-cpanel
npm install
```

### Stellar Testnet indisponível

Troque para o modo lite enquanto a rede estiver fora:

```bash
cd backend-cpanel
npm run dev   # app-lite.ts — sem dependência de rede
```

---

## 📄 Licença

MIT © Hackathon Team
