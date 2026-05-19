import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, ArrowRight, TrendingDown, AlertCircle, Calculator } from 'lucide-react';
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
  const [blendRate, setBlendRate] = useState<BlendRate | null>(null);
  const [usingMockData, setUsingMockData] = useState<boolean>(false);

  useEffect(() => {
    const fetchQuotation = async () => {
      if (!state.product) return;
      
      setLoading(true);
      try {
        // Fetch real quotation from API
        const response: QuotationResponse = await apiService.getQuotation(state.product.price);
        
        // The error was that 'data' does not exist on 'QuotationResponse'
        // Based on the type definition, options are directly on the response object
        if (response.success && response.options) {
          setQuotationOptions(response.options);
          setUsingMockData(false);
        } else {
          console.warn('API returned success:false or no options, using mock data');
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

  // Automatic pricing update when selection changes
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

  const handlePlanSelect = (plan: QuotationOption) => {
    actions.setSelectedPlan(plan);
    setShowPricingDetails(true);
  };

  const handleContinue = () => {
    if (state.selectedPlan) {
      actions.nextStep();
      navigate('/contract');
    }
  };

  const formatAmount = (amount: string) => {
    const brlValue = parseFloat(amount);
    const asset = state.selectedAsset || 'USDC';
    const assetValue = pricingService.convertToAsset(brlValue, asset);
    return (
      <span className="flex flex-col">
        <span className="text-foreground font-semibold">BRL {brlValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span className="text-xs text-muted-foreground font-mono">
          ≈ {pricingService.formatCurrency(assetValue, asset)}
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
        <LoadingSpinner size="lg" message="Calculating personalized BNPL options..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button variant="ghost" onClick={() => navigate('/')} className="flex items-center text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Store
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

        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50 mb-8">
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
                      state.selectedPlan?.installmentsCount === option.installmentsCount ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">{option.installmentsCount}x installments</h4>
                      <div className="text-muted-foreground">{formatAmount(option.installmentAmount)} per payment</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground line-through">Total: {formatAmount(state.product?.price || '0')}</div>
                    <div className="text-lg font-bold text-primary">{formatAmount(option.totalAmount)} Total</div>
                    <span className="text-sm font-medium text-primary">
                      {option.interestRate === '0.0000' 
                        ? blendRate ? `${blendRate.borrowRate.toFixed(1)}% APR via Blend` : 'Low APR' 
                        : `${option.interestRate}% APR`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {showPricingDetails && (
          <Card className="mt-6 border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-primary/5 shadow-lg animate-in fade-in zoom-in duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg">Complete Fee Transparency</CardTitle>
              </div>
              <CardDescription>Blockchain-verified pricing powered by Blend Protocol</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {state.selectedPlan ? (
                selectedPlanPricing ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-background/50 rounded-lg border border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Interest</p>
                      <p className="text-sm font-bold text-primary">{selectedPlanPricing.consumerInterestRate.toFixed(1)}%</p>
                    </div>
                    <div className="p-3 bg-background/50 rounded-lg border border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Savings</p>
                      <p className="text-sm font-bold text-blue-600">
                        {pricingService.formatCurrency(pricingService.convertToAsset(selectedPlanPricing.savings.vsTradionalBNPL, state.selectedAsset), state.selectedAsset)}
                      </p>
                    </div>
                    <div className="p-3 bg-background/50 rounded-lg border border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total ({state.selectedAsset})</p>
                      <p className="text-sm font-bold text-green-600">
                        {pricingService.formatCurrency(pricingService.convertToAsset(selectedPlanPricing.totalConsumerPayment, state.selectedAsset), state.selectedAsset)}
                      </p>
                    </div>
                    <div className="p-3 bg-background/50 rounded-lg border border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Settlement</p>
                      <p className="text-sm font-bold text-purple-600">Instant</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-6">
                    <LoadingSpinner size="sm" message="Calculating optimized rates..." />
                  </div>
                )
              ) : (
                <div className="text-center py-6">
                  <Calculator className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-20" />
                  <p className="text-muted-foreground">Select a plan to see breakdown</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-8 flex justify-end">
          <Button 
            size="lg" 
            onClick={handleContinue} 
            disabled={!state.selectedPlan} 
            className="w-full md:w-auto h-12 px-8 shadow-md"
          >
            Continue to Agreement <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default QuotationPage;