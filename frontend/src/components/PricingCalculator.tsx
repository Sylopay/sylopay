import React, { useState, useEffect } from 'react';
import { Calculator, TrendingDown, TrendingUp, RefreshCw, Info, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
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
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Calculating dynamic rates...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Pricing Overview */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">SyloPay Dynamic Pricing</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={calculatePricing}
              className="flex items-center space-x-1"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-xs">Refresh</span>
            </Button>
          </div>
          <CardDescription>
            Real-time rates powered by Blend Protocol • Last updated: {lastUpdated.toLocaleTimeString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Competitive Advantage Banner */}
          <div className="flex items-center space-x-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <TrendingDown className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-600">
              {pricing.savings.competitiveAdvantage}
            </span>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="text-2xl font-bold text-primary">
                {pricingService.formatPercent(pricing.merchantFee)}
              </div>
              <div className="text-sm text-muted-foreground">Merchant Fee</div>
              <div className="text-xs text-green-600">vs 6% traditional</div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="text-2xl font-bold text-primary">
                {pricingService.formatPercent(pricing.consumerInterestRate)}
              </div>
              <div className="text-sm text-muted-foreground">Consumer Rate</div>
              <div className="text-xs text-blue-600">Dynamic via Blend</div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="text-2xl font-bold text-primary">Instant</div>
              <div className="text-sm text-muted-foreground">Settlement</div>
              <div className="text-xs text-purple-600">vs T+7 traditional</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="w-5 h-5" />
            <span>Detailed Cost Breakdown</span>
          </CardTitle>
          <CardDescription>
            Transparent pricing with blockchain-verified rates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Merchant Costs */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 flex items-center">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
              Merchant Costs
            </h4>
            <div className="space-y-2 pl-5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Merchant Fee ({pricingService.formatPercent(pricing.merchantFee)})
                </span>
                <span className="font-medium">
                  {pricingService.formatCrypto(pricing.merchantFeeAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transaction Fee</span>
                <span className="font-medium">
                  {pricingService.formatCrypto(pricing.transactionFee)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                <span>Total Merchant Cost</span>
                <span className="text-primary">
                  {pricingService.formatCrypto(pricing.totalMerchantCost)}
                </span>
              </div>
            </div>
          </div>

          {/* Consumer Costs */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              Consumer Costs
            </h4>
            <div className="space-y-2 pl-5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Product Amount</span>
                <span className="font-medium">
                  {pricingService.formatCrypto(pricing.originalAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Interest ({pricingService.formatPercent(pricing.consumerInterestRate)})
                </span>
                <span className="font-medium">
                  {pricingService.formatCrypto(pricing.consumerInterestAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                <span>Total Consumer Payment</span>
                <span className="text-green-600">
                  {pricingService.formatCrypto(pricing.totalConsumerPayment)}
                </span>
              </div>
            </div>
          </div>

          {/* Blend Protocol Integration */}
          <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
            <h4 className="font-semibold text-foreground mb-3 flex items-center">
              <Zap className="w-4 h-4 text-purple-600 mr-2" />
              Blend Protocol Integration
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Pool Borrow Rate:</span>
                <span className="font-medium ml-2">
                  {pricingService.formatPercent(pricing.blendBorrowRate)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Pool Utilization:</span>
                <span className="font-medium ml-2">
                  {pricingService.formatPercent(pricing.blendPoolUtilization)}
                </span>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Pool Utilization</span>
                <span>{pricingService.formatPercent(pricing.blendPoolUtilization)}</span>
              </div>
              <Progress value={pricing.blendPoolUtilization} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Market Comparison</CardTitle>
          <CardDescription>
            How SyloPay compares to traditional payment methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {marketComparisons.map((comparison, index) => (
              <div
                key={comparison.provider}
                className={`p-4 rounded-lg border ${
                  comparison.provider === 'SyloPay BNPL'
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-muted/20'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold flex items-center">
                    {comparison.provider}
                    {comparison.provider === 'SyloPay BNPL' && (
                      <Badge variant="default" className="ml-2">Recommended</Badge>
                    )}
                  </h5>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {pricingService.formatPercent(comparison.merchantFee)}
                    </div>
                    <div className="text-xs text-muted-foreground">Merchant Fee</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Transaction Fee:</span>
                    <div className="font-medium">${comparison.transactionFee.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Consumer Rate:</span>
                    <div className="font-medium">
                      {pricingService.formatPercent(comparison.consumerRate)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Settlement:</span>
                    <div className="font-medium">{comparison.settlementTime}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Risk Transfer:</span>
                    <div className="font-medium">
                      {comparison.riskTransfer ? (
                        <Badge variant="secondary" className="text-xs">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">No</Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {comparison.additionalFees.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">Additional Fees: </span>
                    <span className="text-xs">{comparison.additionalFees.join(', ')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PricingCalculator;