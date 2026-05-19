import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SyloPay BNPL API',
      version: '1.0.0',
      description: 'API specifications for the SyloPay Buy Now, Pay Later ecosystem on Stellar.',
      contact: {
        name: 'SyloPay Developer Support',
        url: 'https://github.com/Sylopay/sylopay',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local Development Server',
      },
    ],
    paths: {
      '/health': {
        get: {
          summary: 'Get health status',
          description: 'Returns the operational health status of the API and external services.',
          responses: {
            200: {
              description: 'API is operational.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'healthy' },
                      timestamp: { type: 'string', example: '2026-05-19T05:30:35Z' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/stellar/health': {
        get: {
          summary: 'Get Stellar network connection health',
          description: 'Verifies Horizon node availability and connectivity parameters.',
          responses: {
            200: {
              description: 'Stellar network parameters retrieved.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      connected: { type: 'boolean', example: true },
                      network: { type: 'string', example: 'TESTNET' },
                      latestLedger: { type: 'number', example: 17789234 },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/stellar/create-account': {
        post: {
          summary: 'Create and fund a mock Stellar account',
          description: 'Generates a fresh public/private keypair and simulates friendbot funding.',
          responses: {
            200: {
              description: 'Account created successfully.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      account: {
                        type: 'object',
                        properties: {
                          publicKey: { type: 'string', example: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' },
                          secretKey: { type: 'string', example: '[HIDDEN]' },
                        },
                      },
                      balance: { type: 'string', example: '10000.0000000' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/stellar/account/{publicKey}': {
        get: {
          summary: 'Get Stellar account information',
          description: 'Queries balance and transaction sequences for a given public key.',
          parameters: [
            {
              name: 'publicKey',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'The Stellar public address to query.',
            },
          ],
          responses: {
            200: {
              description: 'Account data returned successfully.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      publicKey: { type: 'string', example: 'GBBD47IF...' },
                      balance: { type: 'string', example: '10000.0000000' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/quotation': {
        post: {
          summary: 'Generate BNPL installment options',
          description: 'Calculates staggered installment values and DeFi APR charges for a transaction amount.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['amount'],
                  properties: {
                    amount: { type: 'number', example: 1200.00 },
                    installments: { type: 'number', example: 3 },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Quotation generated successfully.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      originalAmount: { type: 'number', example: 1200.00 },
                      options: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            installmentsCount: { type: 'number', example: 3 },
                            installmentAmount: { type: 'string', example: '400.00' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/contract': {
        post: {
          summary: 'Register a new BNPL contract',
          description: 'Generates on-chain installment schedules and stores them in persistent ledger records.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['totalAmount', 'installmentsCount'],
                  properties: {
                    merchantPublicKey: { type: 'string', example: 'GD...' },
                    customerPublicKey: { type: 'string', example: 'GC...' },
                    totalAmount: { type: 'number', example: 1200.00 },
                    installmentsCount: { type: 'number', example: 3 },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Contract created successfully.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      contract: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/contract/{id}': {
        get: {
          summary: 'Get contract by ID',
          description: 'Queries full contract record and installment faturas status by unique ID.',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'The unique contract identifier.',
            },
          ],
          responses: {
            200: {
              description: 'Contract retrieved.',
            },
          },
        },
      },
      '/api/stellar/process-payment': {
        post: {
          summary: 'Process installment settlement on-chain',
          description: 'Submits transaction envelope to settle the specified installment using USDC.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['contractId', 'installmentNumber'],
                  properties: {
                    contractId: { type: 'string', example: 'BNPL-1001-...' },
                    installmentNumber: { type: 'number', example: 1 },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Payment processed successfully.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      txHash: { type: 'string', example: 'TX1234...' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
