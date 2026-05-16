// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Quotation Types
export interface QuotationOption {
  installmentsCount: number;
  installmentAmount: string;
  totalAmount: string;
  frequencyDays: number;
  interestRate: string;
  description: string;
}

export interface QuotationResponse {
  success: boolean;
  originalAmount: string;
  options: QuotationOption[];
  currency: string;
  generatedAt: string;
}

// Customer Types
export interface Customer {
  stellarPublicKey: string;
  email: string;
  fullName: string;
  phone?: string;
  documentNumber?: string;
}

// Contract Types
export interface Contract {
  id: string;
  stellarTxHash: string;
  explorerUrl: string;
  status: string;
}

export interface ContractRequest {
  merchantPublicKey: string;
  customerPublicKey: string;
  totalAmount: string;
  installmentsCount: number;
  customer: Customer;
  selectedPlan: QuotationOption;
  termsAccepted: boolean;
}

export interface ContractResponse {
  success: boolean;
  contract: Contract;
}

// Product Types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string;
  category: string;
}

// Stellar Account Types
export interface StellarBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

export interface StellarAccount {
  publicKey: string;
  balance: string;
  balances?: StellarBalance[];
  sequence: string;
  exists?: boolean;
  explorerUrl: string;
}

// App State Types
export interface AppState {
  currentStep: 'checkout' | 'quotation' | 'contract' | 'processing' | 'dashboard';
  product: Product | null;
  selectedPlan: QuotationOption | null;
  customer: Customer | null;
  contract: Contract | null;
  loading: boolean;
  error: string | null;
  selectedAsset: 'USDC' | 'XLM';
}

// Demo Data
export const DEMO_PRODUCT: Product = {
  id: 'samsung-galaxy-s25-ultra',
  name: 'Samsung Galaxy S25 Ultra 5G',
  description: 'The most powerful Samsung smartphone. Snapdragon 8 Elite, 200MP AI camera, 6.9" Dynamic AMOLED 2X display, integrated S Pen, 5000mAh battery with 45W charging and IP68 resistance.',
  price: '19.90',
  image: '/samsung-s25-ultra-main.jpg',
  category: 'Smartphones'
};

export const DEMO_MERCHANT = {
  name: 'TechStore Demo',
  publicKey: 'GDGDQR3GOGDYKMNOVOIVF2LYZZXDPPYJSYCZ3VSDIQOZ6FONU5JTF5HE'
};

export const DEMO_CUSTOMER = {
  stellarPublicKey: 'GA57YQCS5NV4TXQPXR6DIKDYTQCMODQ3HNFKJZOULEE7M74SZ6RAIVLA',
  email: 'demo@hackathon.stellar',
  fullName: 'Demo Customer',
  phone: '+55 11 99999-9999',
  documentNumber: '123.456.789-00'
};