import React, { useState, useEffect } from 'react';
import { Calculator, TrendingDown, RefreshCw, Info, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import pricingService, { PricingBreakdown, MarketComparison } from '../services/pricingService';

interface PricingCalculatorProps {
  amount: number;
  installments: number;
  onPricingUpdate?: (pricing: PricingBreakdown) => void;
}

export function PricingCalculator({ amount, installments, onPricingUpdate }: PricingCalculatorProps) {
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  const [marketComparisons, setMarketComparisons] = useState<MarketComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const calculatePricing = async () => {
    setLoading(true);
    try {
      const newPricing = await pricingService.calculateDynamicPricing(amount, installments);
      setPricing(newPricing);
      setMarketComparisons(pricingService.getMarketComparisons());
      setLastUpdated(new Date());
      onPricingUpdate?.(newPricing);
    } catch (error) {
      console.error('Error calculating pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculatePricing();
  }, [amount, installments]);

  if (loading || !pricing) {
    return (
      <Card className="bg-[#121212] border-zinc-800">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-center space-x-3 text-zinc-400">
            <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
            <span className="text-sm">Calculating dynamic rates...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-orange-500/20 bg-gradient-to-br from-[#121212] to-orange-950/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-orange-500" />
              <CardTitle className="text-lg text-zinc-100">SyloPay Dynamic Pricing</CardTitle>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={calculatePricing}
              className="flex items-center space-x-1 border-zinc-700 bg-[#0a0a0a] hover:bg-zinc-800 text-zinc-300 h-8"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="text-xs">Refresh</span>
            </Button>
          </div>
          <CardDescription className="text-zinc-500">
            Real-time rates powered by Blend Protocol • Updated: {lastUpdated.toLocaleTimeString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          
          <div className="flex items-center space-x-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <TrendingDown className="w-4 h-4 text-green-500" />
            <span className="text-xs font-semibold text-green-400">
              {pricing.savings.competitiveAdvantage}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-[#0a0a0a] rounded-xl border border-zinc-800/80">
              <div className="text-2xl font-bold text-zinc-100">
                {pricingService.formatPercent(pricing.merchantFee)}
              </div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mt-1">Merchant Fee</div>
              <div className="text-[10px] text-green-500/80 mt-1">vs 6% traditional</div>
            </div>
            <div className="text-center p-4 bg-[#0a0a0a] rounded-xl border border-zinc-800/80">
              <div className="text-2xl font-bold text-orange-500">
                {pricingService.formatPercent(pricing.consumerInterestRate)}
              </div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mt-1">Consumer Rate</div>
              <div className="text-[10px] text-indigo-400/80 mt-1">Dynamic via Blend</div>
            </div>
            <div className="text-center p-4 bg-[#0a0a0a] rounded-xl border border-zinc-800/80">
              <div className="text-2xl font-bold text-zinc-100">Instant</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mt-1">Settlement</div>
              <div className="text-[10px] text-purple-400/80 mt-1">vs T+7 traditional</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#121212] border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-zinc-100 text-base">
            <Info className="w-4 h-4 text-zinc-400" />
            <span>Detailed Cost Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold text-zinc-200 mb-3 flex items-center text-sm">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              Merchant Costs
            </h4>
            <div className="space-y-2 pl-4 border-l border-zinc-800 ml-1">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Merchant Fee ({pricingService.formatPercent(pricing.merchantFee)})</span>
                <span className="font-medium text-zinc-300">{pricingService.formatUSDC(pricing.merchantFeeAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Transaction Fee</span>
                <span className="font-medium text-zinc-300">{pricingService.formatUSDC(pricing.transactionFee)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-2 border-t border-zinc-800 mt-2">
                <span className="text-zinc-400">Total Merchant Cost</span>
                <span className="text-orange-500">{pricingService.formatUSDC(pricing.totalMerchantCost)}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-zinc-200 mb-3 flex items-center text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Consumer Costs
            </h4>
            <div className="space-y-2 pl-4 border-l border-zinc-800 ml-1">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Product Amount</span>
                <span className="font-medium text-zinc-300">{pricingService.formatUSDC(pricing.originalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Interest ({pricingService.formatPercent(pricing.consumerInterestRate)})</span>
                <span className="font-medium text-zinc-300">{pricingService.formatUSDC(pricing.consumerInterestAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-2 border-t border-zinc-800 mt-2">
                <span className="text-zinc-400">Total Consumer Payment</span>
                <span className="text-green-500">{pricingService.formatUSDC(pricing.totalConsumerPayment)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-indigo-950/20 rounded-xl border border-indigo-900/30 mt-4">
            <h4 className="text-sm font-semibold text-indigo-400 mb-3 flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              Blend Protocol Integration
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#0a0a0a] p-2 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 block mb-1 uppercase tracking-wider font-semibold text-[10px]">Pool Borrow Rate</span>
                <span className="font-medium text-zinc-200">{pricingService.formatPercent(pricing.blendBorrowRate)}</span>
              </div>
              <div className="bg-[#0a0a0a] p-2 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 block mb-1 uppercase tracking-wider font-semibold text-[10px]">Pool Utilization</span>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-200">{pricingService.formatPercent(pricing.blendPoolUtilization)}</span>
                  <Progress value={pricing.blendPoolUtilization} className="w-16 h-1.5 [&>div]:bg-indigo-500" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PricingCalculator;