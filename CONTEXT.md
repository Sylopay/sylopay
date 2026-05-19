# SyloPay — Contexto do Projeto e Arquitetura do Sistema

O SyloPay é uma plataforma de **Buy Now, Pay Later (BNPL) descentralizada** construída na blockchain **Stellar** utilizando **Smart Contracts Soroban**. Ela permite que e-commerces ofereçam planos de parcelamento flexíveis e transparentes para seus clientes, enquanto recebem o valor total da venda instantaneamente. O ecossistema unifica o fluxo financeiro em USDC e liquidações/entradas baseadas em Pix (via âncoras sandbox).

---

## 🏗 Fluxo da Arquitetura do Sistema

O diagrama abaixo ilustra como o cliente, a carteira digital Freighter, o gateway backend e a rede de testes Stellar interagem:

```mermaid
graph TD
    Cliente[Navegador / Freighter] -->|1. Solicita Cotação| API[Express API Gateway]
    API -->|2. Consulta Taxas| Blend[(Pools do Blend Protocol)]
    Cliente -->|3. Assina XDR do Contrato| Soroban[(Contrato Soroban Rust)]
    Cliente -->|4. Entrada via Pix em BRL| Etherfuse[Âncora Pix Etherfuse]
    Etherfuse -->|5. Swap para USDC & Webhook| API
    API -->|6. Invoca pagar_parcela| Soroban
    Soroban -->|7. Emite Recibo On-chain| Cliente
```

---

## 🗂 Estrutura de Diretórios do Projeto

```
sylopay/
├── CONTEXT.md                   # Este arquivo de contexto detalhado e arquitetura
├── README.md                    # Manual de instalação e instruções rápidas
├── .env.example                 # Variáveis de ambiente padrão sem dados sensíveis
├── package.json                 # Scripts globais de automação
│
├── scripts/                     # Utilitários em JavaScript para desenvolvedores
│   ├── setup-stellar.js         # Geração de keypairs Stellar e Friendbot funding
│   ├── register-webhook.js      # Registro e setup de Webhooks da Etherfuse
│   └── test-webhook.js          # Simulador de recebimento de webhook Pix sandbox
│
├── frontend/                    # SPA React + Vite + TypeScript (porta 3001)
│   ├── public/                  # Imagens e logotipos oficiais da aplicação
│   └── src/
│       ├── App.tsx              # Roteador principal
│       ├── hooks/useBNPL.tsx    # Hook e Contexto global de checkout do fluxo
│       ├── pages/               # CheckoutPage, QuotationPage, ContractPage, DashboardPage, etc.
│       ├── components/          # Componentes reutilizáveis como <Logo />
│       └── services/            # Clientes de API Axios e taxas DeFi
│
├── backend-cpanel/              # Express API Server (porta 3000)
│   └── src/
│       ├── app-hybrid.ts        # Ponto de entrada conectado ao Soroban RPC e Stellar Horizon
│       ├── app-lite.ts          # Servidor isolado com dados mockados para testes offline
│       └── services/
│           ├── storage.ts       # Armazenamento simples de contratos locais (contracts.json)
│           ├── soroban.ts       # Chamadas RPC utilizando Stellar Soroban SDK
│           └── etherfuse.ts     # Integrações com cotações de Pix-para-USDC
│
└── contracts/
    └── sylopay_bnpl/            # Código-fonte do Smart Contract em Rust
        ├── Cargo.toml
        ├── src/
        │   ├── lib.rs           # Pontos de entrada #[contractimpl] limpos
        │   ├── types.rs         # Estruturas #[contracttype] e chaves de armazenamento
        │   ├── utils.rs         # Formatação de IDs e utilitários compartilhados
        │   └── test.rs          # Testes unitários unitários isolados
        └── docs/                # Documentação digital mdBook
```

---

## 🛠 Stack Tecnológica Detalhada

*   **Frontend**: React 18, Vite 5, TypeScript 5, TailwindCSS 3.
*   **Backend**: Node.js, Express, TypeScript, ts-node.
*   **Smart Contracts**: Rust (`soroban-sdk v22`), Cargo.
*   **Stablecoin**: USDC (Testnet).
*   **Rampa de Entrada (Pix)**: Sandbox da API Etherfuse FX + Webhooks criptografados.
*   **Conexão de Carteiras**: `@stellar/freighter-api` (Carteira digital Freighter).

---

## 📝 Smart Contract Soroban (Rust)

O contrato inteligente de Buy Now, Pay Later da SyloPay é totalmente modular e foi refatorado em arquivos limpos e isolados no ecossistema Rust.

*   **ID do Contrato (Testnet)**: `CBY3H6BBUJ64H3QGSDMEQVZU3GKXV4WRE7V7X62PUFXNWYAHI4CCWTXH`
*   **Endereço do USDC (Testnet)**: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`

### Funções Exportadas do Contrato (`lib.rs`)

#### Funções de Alteração de Estado (Mutantes)
*   `initialize(env: Env, admin: Address)`: Configura a conta do administrador do contrato e define o contador em zero.
*   `criar_contrato(env: Env, merchant: Address, cliente: Address, valor_total: i128, num_parcelas: u32) -> String`: Cria, particiona e armazena os dados estruturados de um contrato BNPL na blockchain com datas de vencimento espaçadas a cada 30 dias.
*   `pagar_parcela(env: Env, contrato_id: String, numero_parcela: u32, tx_hash: String)`: Marca uma parcela específica como liquidada no contrato inteligente vinculando o hash da transação.
*   `marcar_inadimplente(env: Env, contrato_id: String)`: Permite apenas ao administrador marcar um contrato com parcelas vencidas e em atraso como inadimplente.

#### Funções de Leitura (Read-Only)
*   `status_contrato(env: Env, contrato_id: String) -> ContratoBNPL`: Retorna a estrutura detalhada contendo o progresso e o estado das parcelas de um contrato.
*   `listar_contratos_cliente(env: Env, cliente: Address) -> Vec<String>`: Retorna a lista de IDs de todos os contratos criados por um cliente.
*   `obter_admin(env: Env) -> Address`: Retorna o endereço da conta administradora do contrato.
*   `total_contratos(env: Env) -> u32`: Retorna o contador total de contratos BNPL emitidos no ecossistema.

---

## 📚 Documentação Técnica Disponível

Para facilitar auditorias e integrações futuras, disponibilizamos três canais de documentação para os smart contracts em `contracts/sylopay_bnpl/`:

1.  **PDF Corporativo Premium**:
    - **[`sylopay_bnpl_docs.pdf`](contracts/sylopay_bnpl/sylopay_bnpl_docs.pdf)**: Layout premium com matriz de segurança detalhada, paleta de cores e tipografia corporativa.
2.  **Livro Interativo (mdBook)**:
    - Localizado em `contracts/sylopay_bnpl/docs/`. Uma interface web moderna e indexável com caixa de pesquisa integrada.
3.  **Especificação Markdown**:
    - **[`sylopay_bnpl_docs.md`](contracts/sylopay_bnpl/sylopay_bnpl_docs.md)**: Versão em markdown simplificado para visualização no GitHub.

---

## 📡 Endpoints do Servidor API Gateway (backend-cpanel)

### Operações Gerais e Stellar
*   `GET /health`: Estado geral operacional da API.
*   `GET /api/stellar/health`: Status de sincronização com o Horizon da Stellar.
*   `POST /api/stellar/create-account`: Financia e ativa chaves públicas Stellar via Friendbot na Testnet.
*   `GET /api/stellar/account/:publicKey`: Retorna saldos (XLM/USDC) e estado da conta na blockchain.
*   `POST /api/stellar/create-trustline`: Configura dinamicamente a trustline do USDC no perfil da carteira.

### Cotações e Conversões (Etherfuse)
*   `POST /api/etherfuse/quote-onramp`: Solicita cotação e taxas da rampa Pix-para-USDC.
*   `POST /api/etherfuse/order`: Gera a ordem Pix e o QRCode Pix correspondente.
*   `GET /api/etherfuse/order/:id`: Consulta o status atual de uma ordem na rampa.

### Operações de Contratos (Soroban)
*   `POST /api/soroban/prepare-contract`: Retorna a transação XDR não assinada para o Freighter criar o contrato.
*   `POST /api/soroban/submit-contract`: Envia a transação assinada para a Testnet Stellar registrando o contrato on-chain.
*   `POST /api/soroban/prepare-payment`: Cria a transação XDR não assinada para pagamentos diretos de parcelas em USDC.
*   `POST /api/soroban/submit-transaction`: Submete parcelas liquidadas via Freighter na rede.
*   `GET /api/soroban/contracts/cliente/:publicKey`: Busca e combina contratos locais e on-chain de um cliente.

### Webhooks
*   `POST /webhook/etherfuse`: Rota segura (verificada via assinatura HMAC) que capta o depósito Pix, faz a rampa para USDC e aciona a chamada automática do contrato inteligente on-chain.

---

## 🎯 Integrações Avançadas e Diferenciais

1.  **Protocolo Blend**: Consultas de pools DeFi para retornar taxas de juros (APR) significativamente mais atrativas em tempo real no checkout comparadas aos cartões tradicionais.
2.  **Protocolo x402**: Suporte nativo ao protocolo Web Monetization. Permite a servidores terceiros e marketplaces consultar o Payment Pointer do merchant (`$stellar.sylopay.com/merchant-vault`) e faturas USDC de forma padronizada via HTTP 402.
3.  **Modo SandBox de Demonstração**: Rota integrada `/demo` no frontend que simula com total realismo visual e funcional o fluxo de compra completo com Pix e USDC on-chain.
