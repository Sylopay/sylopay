import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, QuotationOption, Customer, Contract, Product, DEMO_PRODUCT, DEMO_CUSTOMER } from '../types';

type BNPLAction =
  | { type: 'SET_STEP'; payload: AppState['currentStep'] }
  | { type: 'SET_PRODUCT'; payload: Product }
  | { type: 'SET_SELECTED_PLAN'; payload: QuotationOption }
  | { type: 'SET_CUSTOMER'; payload: Customer }
  | { type: 'SET_CONTRACT'; payload: Contract }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SELECTED_ASSET'; payload: 'USDC' | 'XLM' }
  | { type: 'RESET_FLOW' }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' };

const initialState: AppState = {
  currentStep: 'checkout',
  product: DEMO_PRODUCT,
  selectedPlan: null,
  customer: DEMO_CUSTOMER,
  contract: null,
  loading: false,
  error: null,
  selectedAsset: 'USDC',
};

const stepOrder: AppState['currentStep'][] = ['checkout', 'quotation', 'contract', 'processing', 'dashboard'];

function bnplReducer(state: AppState, action: BNPLAction): AppState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload, error: null };
    
    case 'SET_PRODUCT':
      return { ...state, product: action.payload };
    
    case 'SET_SELECTED_PLAN':
      return { ...state, selectedPlan: action.payload };
    
    case 'SET_CUSTOMER':
      return { ...state, customer: action.payload };
    
    case 'SET_CONTRACT':
      return { ...state, contract: action.payload };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_SELECTED_ASSET':
      return { ...state, selectedAsset: action.payload };
    
    case 'NEXT_STEP':
      const currentIndex = stepOrder.indexOf(state.currentStep);
      const nextIndex = Math.min(currentIndex + 1, stepOrder.length - 1);
      return { ...state, currentStep: stepOrder[nextIndex], error: null };
    
    case 'PREV_STEP':
      const prevCurrentIndex = stepOrder.indexOf(state.currentStep);
      const prevIndex = Math.max(prevCurrentIndex - 1, 0);
      return { ...state, currentStep: stepOrder[prevIndex], error: null };
    
    case 'RESET_FLOW':
      return {
        ...initialState,
        product: state.product, // Keep product but reset everything else
      };
    
    default:
      return state;
  }
}

interface BNPLContextType {
  state: AppState;
  dispatch: React.Dispatch<BNPLAction>;
  actions: {
    setStep: (step: AppState['currentStep']) => void;
    setProduct: (product: Product) => void;
    setSelectedPlan: (plan: QuotationOption) => void;
    setCustomer: (customer: Customer) => void;
    setContract: (contract: Contract) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setSelectedAsset: (asset: 'USDC' | 'XLM') => void;
    nextStep: () => void;
    prevStep: () => void;
    resetFlow: () => void;
    canProceed: () => boolean;
  };
}

const BNPLContext = createContext<BNPLContextType | undefined>(undefined);

export function BNPLProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(bnplReducer, initialState);

  const actions = {
    setStep: (step: AppState['currentStep']) => dispatch({ type: 'SET_STEP', payload: step }),
    setProduct: (product: Product) => dispatch({ type: 'SET_PRODUCT', payload: product }),
    setSelectedPlan: (plan: QuotationOption) => dispatch({ type: 'SET_SELECTED_PLAN', payload: plan }),
    setCustomer: (customer: Customer) => dispatch({ type: 'SET_CUSTOMER', payload: customer }),
    setContract: (contract: Contract) => dispatch({ type: 'SET_CONTRACT', payload: contract }),
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error: string | null) => dispatch({ type: 'SET_ERROR', payload: error }),
    setSelectedAsset: (asset: 'USDC' | 'XLM') => dispatch({ type: 'SET_SELECTED_ASSET', payload: asset }),
    nextStep: () => dispatch({ type: 'NEXT_STEP' }),
    prevStep: () => dispatch({ type: 'PREV_STEP' }),
    resetFlow: () => dispatch({ type: 'RESET_FLOW' }),
    
    canProceed: (): boolean => {
      switch (state.currentStep) {
        case 'checkout':
          return !!state.product;
        case 'quotation':
          return !!state.selectedPlan;
        case 'contract':
          return !!state.customer && !!state.selectedPlan;
        case 'processing':
          return !!state.contract;
        case 'dashboard':
          return true;
        default:
          return false;
      }
    },
  };

  return (
    <BNPLContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </BNPLContext.Provider>
  );
}

export function useBNPL() {
  const context = useContext(BNPLContext);
  if (context === undefined) {
    throw new Error('useBNPL must be used within a BNPLProvider');
  }
  return context;
}