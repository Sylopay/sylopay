import apiService from './api';

export interface PricingModel {
  merchantFee: number; // percentage
  transactionFee: number; // XLM
  consumerInterestRate: number; // percentage
  orchestratorMargin: number; // percentage
}

export interface MarketComparison {
  provider: string;
  merchantFee: number;
  transactionFee: number;
  consumerRate: number;
  additionalFees: string[];
  settlementTime: string;
  riskTransfer: boolean;
}

export interface BlendRate {
  poolId: string;
  borrowRate: number;
  supplyRate: number;
  utilization: number;
  lastUpdated: string;
}

export interface PricingBreakdown {
  originalAmount: number;
  installments: number;
  
  // SyloPay fees
  merchantFee: number;
  merchantFeeAmount: number;
  transactionFee: number;
  totalMerchantCost: number;
  
  // Consumer costs
  consumerInterestRate: number;
  consumerInterestAmount: number;
  totalConsumerPayment: number;
  
  // Orchestrator revenue
  orchestratorMargin: number;
  orchestratorRevenue: number;
  
  // Blend Protocol integration
  blendBorrowRate: number;
  blendPoolUtilization: number;
  
  // Competitive advantage
  savings: {
    vsTradionalBNPL: number;
    vsCreditCard: number;
    competitiveAdvantage: string;
  };
}

class PricingService {
  // SyloPay's competitive pricing model
  private basePricing: PricingModel = {
    merchantFee: 3.5, // vs 4-8% traditional BNPL
    transactionFee: 0.25, // XLM vs $0.30 USD
    consumerInterestRate: 0, // base rate, adjusted by Blend
    orchestratorMargin: 0.5 // our arbitrage margin
  };

  // Market comparison data
  private marketComparisons: MarketComparison[] = [
    {
      provider: "Traditional BNPL",
      merchantFee: 6.0,
      transactionFee: 0.30,
      consumerRate: 0,
      additionalFees: ["Late fees", "Processing fees", "Currency conversion"],
      settlementTime: "T+7 days",
      riskTransfer: true
    },
    {
      provider: "Credit Card Gateway",
      merchantFee: 2.9,
      transactionFee: 0.30,
      consumerRate: 19.99,
      additionalFees: ["Chargeback fees", "PCI compliance", "Gateway fees"],
      settlementTime: "T+2 days",
      riskTransfer: false
    },
    {
      provider: "SyloPay BNPL",
      merchantFee: 3.5,
      transactionFee: 0.25,
      consumerRate: 1.5, // dynamic via Blend
      additionalFees: ["None"],
      settlementTime: "Instant",
      riskTransfer: true
    }
  ];

  async getBlendRates(): Promise<BlendRate> {
    try {
      // In a real implementation, this would fetch from Blend Protocol API
      // For now, we'll simulate realistic rates based on current DeFi markets
      const mockBlendRate: BlendRate = {
        poolId: "BNPL_POOL_001",
        borrowRate: 1.5 + Math.random() * 2, // 1.5-3.5% range
        supplyRate: 0.8 + Math.random() * 1.2, // 0.8-2.0% range
        utilization: 65 + Math.random() * 20, // 65-85% utilization
        lastUpdated: new Date().toISOString()
      };
      
      return mockBlendRate;
    } catch (error) {
      console.error('Error fetching Blend rates:', error);
      // Fallback to base rates
      return {
        poolId: "FALLBACK",
        borrowRate: 2.0,
        supplyRate: 1.2,
        utilization: 75,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  async calculateDynamicPricing(
    amount: number, 
    installments: number
  ): Promise<PricingBreakdown> {
    const blendRate = await this.getBlendRates();
    
    // Dynamic consumer rate based on Blend Protocol
    const dynamicConsumerRate = Math.max(
      this.basePricing.consumerInterestRate,
      blendRate.borrowRate * 0.8 // 20% discount vs direct Blend borrowing
    );

    // Calculate merchant costs
    const merchantFeeAmount = amount * (this.basePricing.merchantFee / 100);
    const transactionFeeAmount = this.basePricing.transactionFee;
    const totalMerchantCost = merchantFeeAmount + transactionFeeAmount;

    // Calculate consumer costs
    const consumerInterestAmount = installments > 1 
      ? amount * (dynamicConsumerRate / 100) 
      : 0;
    const totalConsumerPayment = amount + consumerInterestAmount;

    // Calculate our revenue
    const orchestratorRevenue = amount * (this.basePricing.orchestratorMargin / 100);

    // Calculate competitive savings
    const traditionalBNPLCost = amount * 0.06 + 0.30; // 6% + $0.30
    const creditCardCost = amount * 0.029 + 0.30; // 2.9% + $0.30
    
    const savingsVsBNPL = traditionalBNPLCost - totalMerchantCost;
    const savingsVsCC = totalMerchantCost - creditCardCost; // negative = more expensive

    return {
      originalAmount: amount,
      installments,
      
      // Merchant costs
      merchantFee: this.basePricing.merchantFee,
      merchantFeeAmount,
      transactionFee: transactionFeeAmount,
      totalMerchantCost,
      
      // Consumer costs
      consumerInterestRate: dynamicConsumerRate,
      consumerInterestAmount,
      totalConsumerPayment,
      
      // Our revenue
      orchestratorMargin: this.basePricing.orchestratorMargin,
      orchestratorRevenue,
      
      // Blend integration
      blendBorrowRate: blendRate.borrowRate,
      blendPoolUtilization: blendRate.utilization,
      
      // Competitive analysis
      savings: {
        vsTradionalBNPL: savingsVsBNPL,
        vsCreditCard: savingsVsCC,
        competitiveAdvantage: savingsVsBNPL > 0 
          ? `${((savingsVsBNPL / traditionalBNPLCost) * 100).toFixed(1)}% cheaper than traditional BNPL`
          : "Competitive with market rates"
      }
    };
  }

  getMarketComparisons(): MarketComparison[] {
    return this.marketComparisons;
  }

  formatCrypto(amount: number): string {
    return `${amount.toFixed(7)} USDC`;
  }

  formatPercent(rate: number): string {
    return `${rate.toFixed(2)}%`;
  }

  formatCurrency(amount: number, currency: string = 'BRL'): string {
    if (currency === 'BRL') {
      return `BRL ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return this.formatCrypto(amount);
  }
}

export const pricingService = new PricingService();
export default pricingService;