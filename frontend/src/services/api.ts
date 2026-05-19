import axios from 'axios';
import { QuotationResponse, ContractRequest, ContractResponse, StellarAccount } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use((config) => {
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.message}`, error.response?.data);
    return Promise.reject(error);
  }
);

export const apiService = {
  // Health check
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  },

  // Stellar operations
  async getStellarHealth() {
    const response = await api.get('/api/stellar/health');
    return response.data;
  },

  async createStellarAccount(): Promise<{ success: boolean; account: StellarAccount; explorerUrl: string }> {
    const response = await api.post('/api/stellar/create-account');
    return response.data;
  },

  async getStellarAccount(publicKey: string): Promise<StellarAccount> {
    const response = await api.get(`/api/stellar/account/${publicKey}`);
    return response.data;
  },

  // BNPL operations
  async getQuotation(amount: string): Promise<QuotationResponse> {
    const response = await api.post('/api/quotation', { amount });
    return response.data;
  },

  async createContract(contractData: ContractRequest): Promise<ContractResponse> {
    const response = await api.post('/api/contract', contractData);
    return response.data;
  },

  // Utility methods
  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  formatCrypto(amount: string): string {
    return parseFloat(amount).toFixed(7) + ' USDC';
  },

  generateStellarExplorerUrl(txHash: string): string {
    return `https://stellar.expert/explorer/testnet/tx/${txHash}`;
  },

  generateAccountExplorerUrl(publicKey: string): string {
    return `https://stellar.expert/explorer/testnet/account/${publicKey}`;
  }
};

export default apiService;