# SyloPay — BNPL on Stellar

> **Buy Now, Pay Later** descentralizado, construído na blockchain Stellar com Smart Contracts Soroban e rampa Pix Sandbox para o Hackathon.

---

## 📋 Visão Geral

O SyloPay é uma plataforma BNPL (Buy Now, Pay Later) que utiliza a blockchain **Stellar** para registro transparente de contratos e processamento de pagamentos parcelados. A aplicação é composta por:

- **Frontend** — React + Vite + TypeScript (porta `3001`)
- **Backend** — Express + TypeScript, em dois modos:
  - `app-lite.ts` → Dados 100% mockados (sem dependências externas)
  - `app-hybrid.ts` → Conecta à Stellar Horizon API real e Smart Contracts Soroban (recomendado)
- **Smart Contracts** — Desenvolvidos em Rust no framework Stellar Soroban SDK.

---

## 🗂 Estrutura do Projeto

```
sylopay/
├── frontend/                  # React app (Vite + TypeScript + Tailwind)
│   ├── public/                # Assets públicos (imagens de celulares e o Logo oficial)
│   └── src/
│       ├── pages/             # CheckoutPage, QuotationPage, ContractPage, DashboardPage, etc.
│       ├── hooks/             # useBNPL (contexto global do fluxo)
│       └── components/        # Componentes UI e <Logo />
├── backend-cpanel/            # Backend Express (TypeScript)
│   └── src/
│       ├── app-lite.ts        # Modo demo — tudo mockado
│       └── app-hybrid.ts      # Modo híbrido — integra com Stellar Testnet e Soroban
├── contracts/
│   └── sylopay_bnpl/          # Código-fonte do Smart Contract em Rust
│       ├── src/
│       │   ├── lib.rs         # Entrypoint e lógica de implementação #[contractimpl]
│       │   ├── types.rs       # Tipos, structs e enums #[contracttype]
│       │   ├── utils.rs       # Funções utilitárias e gerador de IDs
│       │   └── test.rs        # Testes unitários isolados #[cfg(test)]
│       └── docs/              # Livro digital interativo mdBook
├── scripts/                   # Utilitários de automação em linha de comando (JS/Shell)
│   ├── setup-stellar.js       # Script para gerar keypairs Stellar de teste
│   ├── register-webhook.js    # Utilitário para registrar webhooks na Etherfuse
│   └── test-webhook.js        # Simulador de gatilhos de webhook Pix locais
├── .env.example               # Variáveis de ambiente padrão
└── package.json               # Scripts globais de desenvolvimento
```

---

## ⚡ Rodando Localmente (Modo Híbrido)

Esta é a forma recomendada de executar e validar a aplicação durante o desenvolvimento.

### Pré-requisitos
*   **Node.js**: `18+`
*   **npm**: `9+`

---

### 1. Clone e instale as dependências

```bash
# Instale as dependências do backend
cd backend-cpanel
npm install

# Instale as dependências do frontend
cd ../frontend
npm install
```

---

### 2. Configure as variáveis de ambiente

Copie o arquivo padrão na raiz do projeto:

```bash
# Na raiz do projeto
cp .env.example .env
```

Preencha as chaves secretas no seu arquivo `.env` (como as chaves da Stellar Testnet e sua chave de sandbox da Etherfuse).

---

### 3. Suba o Backend

Abra um terminal e execute o modo híbrido conectado à Stellar Testnet:

```bash
cd backend-cpanel
npm run dev:hybrid
```

O servidor iniciará em **http://localhost:3000**.

---

### 4. Suba o Frontend

Em outro terminal:

```bash
cd frontend
npm run dev
```

O app abrirá automaticamente em **http://localhost:3001**.

---

### 5. Verifique os serviços

```bash
# Saúde geral da API
curl http://localhost:3000/health

# Conexão com a rede Stellar
curl http://localhost:3000/api/stellar/health
```

---

## 📚 Documentação Técnica do Smart Contract

Oferecemos uma suíte completa de especificações técnicas para o contrato Soroban do SyloPay localizados em `contracts/sylopay_bnpl/`:

1.  **Livro Interativo (mdBook)**:
    - Uma documentação digital completa com motor de busca rápida e modo escuro nativo.
    - Como executar localmente:
      ```bash
      cd contracts/sylopay_bnpl/docs
      ~/.cargo/bin/mdbook serve --open
      ```
2.  **Documento PDF Premium**:
    - **[`sylopay_bnpl_docs.pdf`](contracts/sylopay_bnpl/sylopay_bnpl_docs.pdf)**: Relatório de nível de especificação técnica com matriz de segurança e diagramas estilizados, perfeito para apresentações a investidores.
3.  **Documento Markdown Padrão**:
    - **[`sylopay_bnpl_docs.md`](contracts/sylopay_bnpl/sylopay_bnpl_docs.md)**: Ideal para consulta rápida direto no GitHub.

---

## 🔀 Fluxo da Aplicação

```
[/]           CheckoutPage   → Seleção de produtos de alta tecnologia
[/quotation]  QuotationPage  → Cotação de parcelas via pools DeFi (Blend)
[/contract]   ContractPage   → Revisão de parcelas e assinatura de contrato com Freighter
[/processing] ProcessingPage → Registro on-chain e geração do QR Code Pix sandbox
[/dashboard]  DashboardPage  → Acompanhamento e quitação das faturas on-chain
```

---

## 🛠 Scripts do Projeto

### Raiz do projeto
*   `npm run dev:backend` — Inicia o backend (modo lite).
*   `npm run dev:frontend` — Inicia o servidor frontend.

### `backend-cpanel/`
*   `npm run dev` — Modo lite com mock de dados.
*   `npm run dev:hybrid` — Modo híbrido conectado ao Horizon e Soroban.
*   `npm run build` — Compila TypeScript para produção.

### `frontend/`
*   `npm run dev` — Servidor hot-reload de desenvolvimento (porta `3001`).
*   `npm run build` — Compilação estática de produção.

---

## 🔑 Contas de Teste Stellar (Testnet)

Para criar contas de teste e obter fundos via Friendbot:

```bash
node scripts/setup-stellar.js
```

Insira as chaves geradas no arquivo `.env` da raiz do projeto para habilitar as carteiras master, merchant e customer.

---

## 🧰 Stack Tecnológica

| Camada | Tecnologia |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, TypeScript 5, Tailwind CSS 3, Radix UI |
| **Backend** | Node.js, Express 4, TypeScript 5, ts-node, nodemon |
| **Blockchain** | Stellar Testnet (Horizon REST API) |
| **Smart Contracts** | Soroban Rust SDK (`v22`), Cargo |
| **Wallet Integration** | `@stellar/freighter-api` (Carteira Freighter) |

---

## 📄 Licença

MIT © Hackathon Team
