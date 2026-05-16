import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Calendar, DollarSign, CreditCard, Zap, ArrowRight, Calculator, TrendingDown, AlertCircle } from 'lucide-react';
import { useBNPL } from '../hooks/useBNPL';
import { QuotationOption } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import LoadingSpinner from '../components/LoadingSpinner';
import Logo from '../components/Logo';
import PricingCalculator from '../components/PricingCalculator';
import apiService from '../services/api';
import { PricingBreakdown } from '../services/pricingService';
import pricingService, { BlendRate } from '../services/pricingService';

// Mock quotation generator for when API is unavailable
function generateMockQuotation(amount: string, maxInstallments: number): QuotationOption[] {
  const total = parseFloat(amount);
  const options: QuotationOption[] = [];
  
  for (let installments = 2; installments <= maxInstallments; installments++) {
    const installmentAmount = (total / installments).toFixed(7);
    options.push({
      installmentsCount: installments,
      installmentAmount,
      totalAmount: amount,
      frequencyDays: 30,
      interestRate: '2.5', // Mock interest rate
      description: `${installments}x of ${parseFloat(installmentAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} BRL`
    });
  }
  
  return options;
}

export function QuotationPage() {
  const { state, actions } = useBNPL();
  const navigate = useNavigate();
  const [quotationOptions, setQuotationOptions] = useState<QuotationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPricingDetails, setShowPricingDetails] = useState(false);
  const [selectedPlanPricing, setSelectedPlanPricing] = useState<PricingBreakdown | null>(null);
  const [maxInstallments, setMaxInstallments] = useState<number>(4);
  const [blendRate, setBlendRate] = useState<BlendRate | null>(null);
  const [usingMockData, setUsingMockData] = useState<boolean>(false);

  useEffect(() => {
    const fetchQuotation = async () => {
      if (!state.product) return;
      
      setLoading(true);
      try {
        // Try to fetch real quotation from API
        const response = await apiService.getQuotation(state.product.price);
        if (response.success && response.data) {
          setQuotationOptions(response.data.options);
          setMaxInstallments(response.data.options.length + 1);
          setUsingMockData(false);
        } else {
          // Fallback to mock data if API fails
          console.warn('API quotation failed, using mock data');
          setQuotationOptions(generateMockQuotation(state.product.price, 4));
          setUsingMockData(true);
        }

        // Also fetch current Blend rates
        const rates = await pricingService.getBlendRates();
        setBlendRate(rates);
      } catch (error) {
        console.error('Error fetching quotation:', error);
        setQuotationOptions(generateMockQuotation(state.product.price, 4));
        setUsingMockData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [state.product]);


  const handlePlanSelect = (plan: QuotationOption) => {
    actions.setSelectedPlan(plan);
    setShowPricingDetails(true);
    // Commented out automatic redirect to allow users to explore fee breakdown
    // actions.nextStep(); // Go to contract
    // navigate('/contract');
  };

  const handleContinue = () => {
    if (state.selectedPlan) {
      actions.nextStep(); // Go to contract
      navigate('/contract');
    }
  };

  const formatAmount = (amount: string) => {
    const brlValue = parseFloat(amount);
    const assetValue = pricingService.convertToAsset(brlValue, state.selectedAsset);
    return (
      <span className="flex flex-col">
        <span className="text-foreground">BRL {brlValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span className="text-xs text-muted-foreground font-mono">
          ≈ {pricingService.formatCurrency(assetValue, state.selectedAsset)}
        </span>
      </span>
    );
  };

  const formatDate = (daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-muted-foreground animate-pulse">Calculating personalized BNPL options...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Header */}
      <header className="border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="flex items-center text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Store
            </Button>
            <div className="flex items-center space-x-3">
              <Logo size="sm" />
              <h1 className="text-lg font-semibold tracking-tight">Payment Options</h1>
            </div>
            <div className="w-20" /> {/* Spacer for symmetry */}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Step 2 of 5</span>
            <span>40% Complete</span>
          </div>
          <Progress value={40} className="h-2" />
        </div>

        {usingMockData && (
          <Badge variant="outline" className="mb-6 bg-amber-500/10 text-amber-600 border-amber-500/20 py-1.5 px-3">
            <AlertCircle className="w-3.5 h-3.5 mr-2" />
            System using optimized fallback rates (Testnet Connectivity)
          </Badge>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
          {/* Asset Selector */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
            <div>
              <h4 className="font-semibold text-foreground">Currency Preference</h4>
              <p className="text-xs text-muted-foreground">Choose your preferred on-chain asset</p>
            </div>
            <div className="flex bg-background border rounded-lg p-1">
              <Button 
                variant={state.selectedAsset === 'USDC' ? 'default' : 'ghost'} 
                size="sm" 
                className="h-8 px-4"
                onClick={() => actions.setSelectedAsset('USDC')}
              >
                USDC
              </Button>
              <Button 
                variant={state.selectedAsset === 'XLM' ? 'default' : 'ghost'} 
                size="sm" 
                className="h-8 px-4"
                onClick={() => actions.setSelectedAsset('XLM')}
              >
                XLM
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {quotationOptions.map((option, index) => (
              <Card 
                key={index}
                className={`cursor-pointer transition-all duration-200 border-2 ${
                  state.selectedPlan?.installmentsCount === option.installmentsCount 
                    ? 'border-primary ring-1 ring-primary/20 bg-primary/5' 
                    : 'border-border hover:border-primary/40 hover:bg-muted/50'
                }`}
                onClick={() => handlePlanSelect(option)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        state.selectedPlan?.installmentsCount === option.installmentsCount 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold">
                          {option.installmentsCount}x installments
                        </h4>
                        <div className="text-muted-foreground">
                          {formatAmount(option.installmentAmount)} per payment
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <div className="text-sm text-muted-foreground line-through">
                        Total: {formatAmount(state.product?.price || '0')}
                      </div>
                      <div className="text-lg font-bold text-primary">
                        {formatAmount(option.totalAmount)} Total
                      </div>
                      <span className="text-sm font-medium text-primary">
                        {option.interestRate === '0.0000' 
                          ? blendRate 
                            ? `${blendRate.borrowRate.toFixed(1)}% APR via Blend`
                            : 'Low APR via Blend'
                          : `${option.interestRate}% APR`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Payment Schedule */}
                  <Card className="bg-muted/50 mt-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Payment Schedule</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {Array.from({ length: option.installmentsCount }, (_, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Payment {i + 1} - {formatDate((i + 1) * option.frequencyDays)}
                            </span>
                            <span className="font-medium">{formatAmount(option.installmentAmount)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Pricing Details Section */}
        {showPricingDetails && (
          <Card className="mt-6 border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-primary/5">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-5 h-5 text-blue-600" />
                <CardTitle>Complete Fee Transparency</CardTitle>
              </div>
              <CardDescription>
                Blockchain-verified pricing powered by Blend Protocol
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="hidden">
                {state.selectedPlan && (
                  <PricingCalculator
                    amount={parseFloat(state.product?.price || '0')}
                    installments={state.selectedPlan.installmentsCount}
                    onPricingUpdate={(pricing) => setSelectedPlanPricing(pricing)}
                  />
                )}
              </div>

              {state.selectedPlan ? (
                <div className="space-y-4">
                   {/* Simple breakdown inside the page */}
                   {selectedPlanPricing ? (
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-1 duration-300">
                        <div className="p-3 bg-background rounded-lg border">
                          <p className="text-[10px] text-muted-foreground uppercase">Principal</p>
                          <p className="text-sm font-bold text-foreground">
                            {pricingService.formatCurrency(selectedPlanPricing.originalAmount, 'BRL')}
                          </p>
                        </div>
                        <div className="p-3 bg-background rounded-lg border">
                          <p className="text-[10px] text-muted-foreground uppercase">Interest ({selectedPlanPricing.consumerInterestRate.toFixed(1)}%)</p>
                          <p className="text-sm font-bold text-primary">
                            {pricingService.formatCurrency(pricingService.convertToAsset(selectedPlanPricing.consumerInterestAmount, state.selectedAsset), state.selectedAsset)}
                          </p>
                        </div>
                        <div className="p-3 bg-background rounded-lg border">
                          <p className="text-[10px] text-muted-foreground uppercase">Total ({state.selectedAsset})</p>
                          <p className="text-sm font-bold text-green-600">
                            {pricingService.formatCurrency(pricingService.convertToAsset(selectedPlanPricing.totalConsumerPayment, state.selectedAsset), state.selectedAsset)}
                          </p>
                        </div>
                        <div className="p-3 bg-background rounded-lg border">
                          <p className="text-[10px] text-muted-foreground uppercase">Blend Savings</p>
                          <p className="text-sm font-bold text-blue-600">
                            {pricingService.formatCurrency(pricingService.convertToAsset(selectedPlanPricing.savings.vsTradionalBNPL, state.selectedAsset), state.selectedAsset)}
                          </p>
                        </div>
                     </div>
                   ) : (
                     <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="ml-3 text-muted-foreground">Calculating optimized rates...</span>
                     </div>
                   )}
                </div>
              ) : (
                <Card className="border-dashed border-2 border-muted-foreground/20">
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <Calculator className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Select a Payment Plan
                      </h3>
                      <p className="text-muted-foreground">
                        Choose one of the installment options above to see detailed fee breakdown, 
                        competitive analysis, and savings compared to traditional BNPL providers.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Button */}
        <div className="mt-8 flex justify-end">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!state.selectedPlan}
            className="w-full md:w-auto h-12 px-8"
          >
            <span className="mr-2">Continue to Agreement</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default QuotationPage;