import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, TrendingDown, AlertCircle, Calculator,
  ChevronDown, ChevronUp, Zap, Shield, Eye, DollarSign,
  RefreshCw, Calendar, Check
} from 'lucide-react';
import { useBNPL } from '../hooks/useBNPL';
import { QuotationOption, QuotationResponse } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import apiService from '../services/api';
import pricingService, { BlendRate, PricingBreakdown } from '../services/pricingService';
import LoadingSpinner from '../components/LoadingSpinner';
import Logo from '../components/Logo';

function generateMockQuotation(amount: string, maxInstallments: number): QuotationOption[] {
  const usdcTotal = parseFloat(amount) / 5.7;
  // Apply Blend-simulated consumer rate (2.0%) + SyloPay margin (0.5%) = 2.5%
  const CONSUMER_RATE = 0.025;
  const options: QuotationOption[] = [];
  for (let installments = 2; installments <= maxInstallments; installments++) {
    const interestAmount = usdcTotal * CONSUMER_RATE;
    const totalWithInterest = usdcTotal + interestAmount;
    const installmentAmount = (totalWithInterest / installments).toFixed(7);
    options.push({
      installmentsCount: installments,
      installmentAmount,
      totalAmount: totalWithInterest.toFixed(7),
      frequencyDays: 30,
      interestRate: (CONSUMER_RATE * 100).toFixed(2),
      description: `${installments}x of ${parseFloat(installmentAmount).toFixed(2)} USDC`
    });
  }
  return options;
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function QuotationPage() {
  const { state, actions } = useBNPL();
  const navigate = useNavigate();
  const [quotationOptions, setQuotationOptions] = useState<QuotationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);
  const [selectedPlanPricing, setSelectedPlanPricing] = useState<PricingBreakdown | null>(null);
  const [blendRate, setBlendRate] = useState<BlendRate | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
  const [refreshingRates, setRefreshingRates] = useState(false);

  // Force USDC on mount
  useEffect(() => {
    if (state.selectedAsset !== 'USDC') {
      actions.setSelectedAsset('USDC');
    }
  }, [state.selectedAsset]); // eslint-disable-line react-hooks/exhaustive-deps

  const usdcTotal = parseFloat(state.product?.price || '0') / 5.7;

  const fetchData = useCallback(async () => {
    if (!state.product) return;
    setLoading(true);
    try {
      const response: QuotationResponse = await apiService.getQuotation(state.product.price);
      if (response.success && response.options) {
        const converted = response.options.map(opt => ({
          ...opt,
          totalAmount: (parseFloat(opt.totalAmount) / 5.7).toFixed(7),
          installmentAmount: (parseFloat(opt.installmentAmount) / 5.7).toFixed(7),
        }));
        setQuotationOptions(converted);
        setUsingMockData(false);
      } else {
        setQuotationOptions(generateMockQuotation(state.product.price, 4));
        setUsingMockData(true);
      }
      const rates = await pricingService.getBlendRates();
      setBlendRate(rates);
    } catch {
      setQuotationOptions(generateMockQuotation(state.product?.price || '0', 4));
      setUsingMockData(true);
    } finally {
      setLoading(false);
      setLastUpdated(new Date().toLocaleTimeString());
    }
  }, [state.product]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const updatePricing = async () => {
      if (state.selectedPlan && state.product) {
        try {
          const pricing = await pricingService.calculateDynamicPricing(
            parseFloat(state.product.price),
            state.selectedPlan.installmentsCount
          );
          setSelectedPlanPricing(pricing);
        } catch (err) {
          console.error('Pricing calc error:', err);
        }
      }
    };
    updatePricing();
  }, [state.selectedPlan, state.product]);

  const handleRefreshRates = async () => {
    setRefreshingRates(true);
    try {
      const rates = await pricingService.getBlendRates();
      setBlendRate(rates);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch { /* silent */ }
    setRefreshingRates(false);
  };

  const handlePlanSelect = (plan: QuotationOption) => {
    actions.setSelectedPlan(plan);
  };

  const handleContinue = () => {
    if (state.selectedPlan) {
      actions.nextStep();
      navigate('/contract');
    }
  };

  const getInstallmentDates = (count: number, frequencyDays: number) =>
    Array.from({ length: count }, (_, i) => addDays(frequencyDays * (i + 1)));

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
        <LoadingSpinner size="lg" message="Calculating personalized BNPL options..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button variant="ghost" onClick={() => navigate('/')} className="flex items-center text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-3">
              <Logo size="sm" />
              <h1 className="text-lg font-semibold tracking-tight">Payment Options</h1>
            </div>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Step 2 of 5</span>
            <span>40% Complete</span>
          </div>
          <Progress value={40} className="h-2" />
        </div>

        {/* Product Summary Card */}
        {state.product && (
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-xl">📱</div>
              <div>
                <p className="font-semibold text-foreground">{state.product.name}</p>
                <p className="text-sm text-muted-foreground">
                  Total amount: <span className="font-bold text-foreground">USDC {usdcTotal.toFixed(2)}</span>
                </p>
              </div>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20">Selected</Badge>
          </div>
        )}

        {/* Title Row + Fee Toggle */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Choose Your Payment Plan</h2>
            <p className="text-sm text-muted-foreground">Select the installment option that works best for you</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFeeBreakdown(!showFeeBreakdown)}
            className="flex items-center gap-2 border-border text-muted-foreground hover:text-foreground"
          >
            {showFeeBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showFeeBreakdown ? 'Hide' : 'Show'} Fee Breakdown
          </Button>
        </div>

        {/* Demo Warning */}
        {usingMockData && (
          <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span><strong>Demo Mode – API Unavailable.</strong> Using mock data for demonstration. Rates are simulated.</span>
          </div>
        )}

        {/* Blend Pool Credit Limit Banner */}
        {blendRate && (
          <div className="flex items-center justify-between p-3 bg-violet-500/5 border border-violet-500/20 rounded-lg mb-6">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-violet-500/20 rounded-md flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-violet-300">Blend Pool Credit Limit</p>
                <p className="text-[10px] text-muted-foreground">Based on current pool liquidity and risk assessment</p>
              </div>
            </div>
            <Badge variant="outline" className="border-violet-500/30 text-violet-400 text-[10px]">
              Max {quotationOptions.length}x installments
            </Badge>
          </div>
        )}

        {/* Plan Cards */}
        <div className="space-y-4 mb-6">
          {quotationOptions.map((option, index) => {
            const isSelected = state.selectedPlan?.installmentsCount === option.installmentsCount;
            const isPopular = option.installmentsCount === 3;
            const installmentUsdc = parseFloat(option.installmentAmount);
            const dates = getInstallmentDates(option.installmentsCount, option.frequencyDays || 30);

            return (
              <Card
                key={index}
                className={`cursor-pointer transition-all duration-200 border-2 ${
                  isSelected
                    ? 'border-primary ring-1 ring-primary/20 bg-primary/5'
                    : 'border-border hover:border-primary/40 hover:bg-muted/30'
                }`}
                onClick={() => handlePlanSelect(option)}
              >
                <CardContent className="p-5">
                  {/* Card Header Row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div>
                        <h4 className="text-base font-bold">{option.installmentsCount}x installments</h4>
                        <p className="text-sm text-muted-foreground">USDC {installmentUsdc.toFixed(2)} per payment</p>
                      </div>
                    </div>
                    {isPopular && (
                      <Badge className="bg-orange-500 text-white text-[10px] border-none">Most Popular</Badge>
                    )}
                  </div>

                  {/* Summary Row */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-4 pl-8">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Total: <span className="font-semibold text-foreground ml-1">USDC {parseFloat(option.totalAmount).toFixed(2)}</span>
                    </span>
                    <span className="flex items-center gap-1 text-zinc-500">
                      Principal: USDC {usdcTotal.toFixed(2)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Every {option.frequencyDays || 30} days
                    </span>
                    <span className="flex items-center gap-1 text-orange-400 font-medium">
                      <TrendingDown className="w-3 h-3" />
                      {(parseFloat(option.interestRate) > 0
                        ? parseFloat(option.interestRate)
                        : blendRate
                        ? blendRate.borrowRate * 0.8 + 0.5
                        : 2.5
                      ).toFixed(2)}% APR
                    </span>
                    <span className="text-green-500/80">
                      +USDC {(parseFloat(option.totalAmount) - usdcTotal).toFixed(2)} interest
                    </span>
                  </div>

                  {/* Payment Schedule */}
                  <div className="bg-muted/30 rounded-lg p-3 ml-8">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Payment Schedule</p>
                    <div className="space-y-1.5">
                      {dates.map((date, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Payment {i + 1} – {date}</span>
                          <span className="font-semibold text-foreground">USDC {installmentUsdc.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Fee Breakdown Panel */}
        {showFeeBreakdown && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <Card className="border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="w-5 h-5 text-blue-400" />
                    <CardTitle className="text-base">Complete Fee Transparency</CardTitle>
                  </div>
                  <Button
                    variant="ghost" size="sm"
                    onClick={handleRefreshRates}
                    disabled={refreshingRates}
                    className="h-7 px-2 text-xs text-muted-foreground"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${refreshingRates ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                <CardDescription>Blockchain-verified pricing powered by Blend Protocol</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {blendRate ? (
                  <>
                    <p className="text-[10px] text-muted-foreground -mt-2">
                      Real-time rates powered by Blend Protocol • Last updated: {lastUpdated}
                    </p>

                    {/* Savings badge */}
                    {selectedPlanPricing && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-green-400">
                        <TrendingDown className="w-3 h-3" />
                        {((6 - selectedPlanPricing.consumerInterestRate) / 6 * 100).toFixed(1)}% cheaper than traditional BNPL
                      </div>
                    )}

                    {/* Key Metrics */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-background/50 rounded-lg border border-border/50 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Merchant Fee</p>
                        <p className="text-sm font-bold text-primary">{selectedPlanPricing?.merchantFee?.toFixed(2) ?? '3.50'}%</p>
                        <p className="text-[9px] text-muted-foreground">vs 6% traditional</p>
                      </div>
                      <div className="p-3 bg-background/50 rounded-lg border border-border/50 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Consumer Rate</p>
                        <p className="text-sm font-bold text-blue-400">
                          {selectedPlanPricing?.consumerInterestRate?.toFixed(2) ?? blendRate.borrowRate.toFixed(2)}%
                        </p>
                        <p className="text-[9px] text-muted-foreground">Dynamic via Blend</p>
                      </div>
                      <div className="p-3 bg-background/50 rounded-lg border border-border/50 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Settlement</p>
                        <p className="text-sm font-bold text-green-400">Instant</p>
                        <p className="text-[9px] text-muted-foreground">vs T+7 traditional</p>
                      </div>
                    </div>

                    {/* Detailed Cost Breakdown */}
                    {selectedPlanPricing ? (
                      <div>
                        <p className="text-xs font-bold text-foreground mb-1">Detailed Cost Breakdown</p>
                        <p className="text-[10px] text-muted-foreground mb-3">Transparent pricing with blockchain-verified rates</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-background/40 rounded-lg p-3 border border-border/30">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Consumer Costs</p>
                            <div className="space-y-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Product Amount</span>
                                <span className="font-mono">USDC {usdcTotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Interest ({selectedPlanPricing.consumerInterestRate.toFixed(2)}%)</span>
                                <span className="font-mono">USDC {selectedPlanPricing.consumerInterestAmount.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between font-bold border-t border-border/30 pt-1 mt-1">
                                <span>Total Payment</span>
                                <span className="text-green-400 font-mono">USDC {(usdcTotal * (1 + selectedPlanPricing.consumerInterestRate / 100)).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-background/40 rounded-lg p-3 border border-border/30">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Blend Protocol</p>
                            <div className="space-y-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Pool Borrow Rate</span>
                                <span className="font-mono">{blendRate.borrowRate.toFixed(2)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Pool Utilization</span>
                                <span className="font-mono">{blendRate.utilization.toFixed(2)}%</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1">Pool Utilization</p>
                              <Progress value={blendRate.utilization} className="h-1.5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Calculator className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-20" />
                        <p className="text-xs text-muted-foreground">Select a plan above to see detailed breakdown</p>
                      </div>
                    )}

                    {/* Market Comparison */}
                    <div>
                      <p className="text-sm font-bold text-foreground mb-1">Market Comparison</p>
                      <p className="text-xs text-muted-foreground mb-4">How SyloPay compares to traditional payment methods</p>

                      {/* Header Row */}
                      <div className="grid grid-cols-4 gap-2 mb-2 px-1">
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Method</div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Merchant</div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Consumer</div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Settlement</div>
                      </div>

                      <div className="space-y-2">
                        {/* Traditional BNPL */}
                        <div className="grid grid-cols-4 gap-2 items-center bg-background/40 border border-border/40 rounded-lg px-3 py-3">
                          <div>
                            <p className="text-xs font-semibold text-foreground">Traditional BNPL</p>
                            <p className="text-[10px] text-muted-foreground">Klarna, Afterpay</p>
                          </div>
                          <div className="text-center">
                            <span className="text-sm font-bold text-red-400">6.00%</span>
                          </div>
                          <div className="text-center">
                            <span className="text-sm font-bold text-foreground">0%</span>
                            <p className="text-[9px] text-muted-foreground leading-tight">(merchant pays,<br/>late fees apply)</p>
                          </div>
                          <div className="text-center">
                            <span className="text-xs font-semibold text-muted-foreground">T+7 days</span>
                          </div>
                        </div>

                        {/* Credit Card */}
                        <div className="grid grid-cols-4 gap-2 items-center bg-background/40 border border-border/40 rounded-lg px-3 py-3">
                          <div>
                            <p className="text-xs font-semibold text-foreground">Credit Card</p>
                            <p className="text-[10px] text-muted-foreground">Visa, Mastercard</p>
                          </div>
                          <div className="text-center">
                            <span className="text-sm font-bold text-orange-400">2.90%</span>
                          </div>
                          <div className="text-center">
                            <span className="text-sm font-bold text-red-400">19.99%</span>
                            <p className="text-[9px] text-muted-foreground">revolving APR</p>
                          </div>
                          <div className="text-center">
                            <span className="text-xs font-semibold text-muted-foreground">T+2 days</span>
                          </div>
                        </div>

                        {/* SyloPay — highlighted */}
                        <div className="grid grid-cols-4 gap-2 items-center bg-primary/5 border-2 border-primary/40 rounded-lg px-3 py-3">
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <p className="text-xs font-bold text-foreground">SyloPay BNPL</p>
                              <Badge className="text-[8px] bg-primary text-primary-foreground border-none px-1.5 py-0">Best</Badge>
                            </div>
                            <p className="text-[10px] text-primary/70">Powered by Blend + Stellar</p>
                          </div>
                          <div className="text-center">
                            <span className="text-sm font-bold text-primary">3.50%</span>
                          </div>
                          <div className="text-center">
                            <span className="text-sm font-bold text-green-400">
                              {blendRate ? `${(blendRate.borrowRate * 0.8).toFixed(2)}%` : '~1.50%'}
                            </span>
                            <p className="text-[9px] text-green-400/70">live Blend rate</p>
                          </div>
                          <div className="text-center">
                            <span className="text-xs font-bold text-green-400">Instant</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
                        * Traditional BNPL charges 0% to consumers because merchants absorb the cost (6% fee). Hidden fees such as late payment penalties still apply.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner size="sm" message="Loading live rates..." />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Continue Button */}
        <div className="flex justify-center mb-10">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!state.selectedPlan}
            className="w-full md:w-auto h-12 px-10 shadow-lg"
          >
            Continue with Selected Plan <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>

        {/* Why Choose SyloPay BNPL? */}
        <div className="border-t border-border/40 pt-8">
          <h3 className="text-lg font-bold text-foreground mb-1">Why Choose SyloPay BNPL?</h3>
          <p className="text-sm text-muted-foreground mb-6">Experience the future of payments with blockchain technology</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: <Zap className="w-4 h-4 text-orange-400" />, title: 'Instant Approval', desc: 'No lengthy credit checks or waiting' },
              { icon: <Shield className="w-4 h-4 text-blue-400" />, title: 'Blockchain Security', desc: 'Secured by Stellar network technology' },
              { icon: <Eye className="w-4 h-4 text-green-400" />, title: 'Complete Transparency', desc: 'Track everything on Stellar Explorer' },
              { icon: <DollarSign className="w-4 h-4 text-purple-400" />, title: 'No Hidden Fees', desc: 'What you see is what you pay' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
                <div className="mt-0.5 flex-shrink-0">{item.icon}</div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuotationPage;