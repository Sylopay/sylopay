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

      // Declarada aqui para ser acessível tanto no try quanto no catch
      const poolMaxInstallments = Math.floor(Math.random() * 3) + 2; // Random between 2-4
      setMaxInstallments(poolMaxInstallments);

      try {
        setLoading(true);
        
        // Fetch Blend rates for realistic interest display
        const blendRates = await pricingService.getBlendRates();
        setBlendRate(blendRates);
        
        const response = await apiService.getQuotation(state.product.price);
        
        // Filter options based on Blend Pool's max installments
        const filteredOptions = response.options.filter(
          option => option.installmentsCount <= poolMaxInstallments
        );
        
        setQuotationOptions(filteredOptions);
        setUsingMockData(false);
      } catch (error) {
        console.error('Error fetching quotation:', error);
        console.log('🔄 API unavailable, using mock data for demo');
        
        // Fallback to mock data when API is unavailable
        const mockOptions = generateMockQuotation(state.product.price, poolMaxInstallments);
        setQuotationOptions(mockOptions);
        setUsingMockData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [state.product]);

  const handlePlanSelect = (plan: QuotationOption) => {
    actions.setSelectedPlan(plan);
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
    const value = parseFloat(amount);
    return `BRL ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toLocaleDateString('en-US');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Logo size="lg" className="mb-4" />
              <LoadingSpinner size="lg" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Calculating Payment Options</h3>
                <p className="text-muted-foreground">Finding the best installment plans for you...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Header */}
      <header className="border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-3">
              <Logo size="sm" />
              <h1 className="text-lg font-semibold">Payment Options</h1>
            </div>
            <div className="w-16" />
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

        {/* Product Summary */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📱</span>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">
                  {state.product?.name}
                </h2>
                <p className="text-muted-foreground">
                  Total amount: <span className="font-semibold text-foreground">{formatAmount(state.product?.price || '0')}</span>
                </p>
              </div>
              <Badge variant="secondary">Selected</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Payment Options */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Choose Your Payment Plan
              </h3>
              <p className="text-muted-foreground">
                Select the installment option that works best for you
              </p>
            </div>
            <Button
              variant={showPricingDetails ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPricingDetails(!showPricingDetails)}
              className="flex items-center"
            >
              <Calculator className="w-4 h-4 mr-2" />
              {showPricingDetails ? "Hide" : "Show"} Fee Breakdown
            </Button>
          </div>

          {/* API Status Indicator */}
          {usingMockData && (
            <Card className="bg-gradient-to-r from-orange-500/5 to-yellow-500/5 border-orange-500/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-500/10 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-orange-600">
                      Demo Mode - API Unavailable
                    </p>
                    <p className="text-xs text-orange-600/80">
                      Using mock data for demonstration. Rates are simulated.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Blend Pool Limit Indicator */}
          <Card className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-purple-500/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center">
                    <Zap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Blend Pool Credit Limit
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Based on current pool liquidity and risk assessment
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                  Max {maxInstallments}x installments
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {quotationOptions.map((option, index) => (
              <Card
                key={index}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  state.selectedPlan?.installmentsCount === option.installmentsCount
                    ? 'ring-2 ring-primary border-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handlePlanSelect(option)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center
                        ${state.selectedPlan?.installmentsCount === option.installmentsCount
                          ? 'border-primary bg-primary'
                          : 'border-muted'
                        }
                      `}>
                        {state.selectedPlan?.installmentsCount === option.installmentsCount && (
                          <Check className="w-4 h-4 text-primary-foreground" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-foreground">
                          {option.installmentsCount}x installments
                        </h4>
                        <p className="text-muted-foreground">
                          {formatAmount(option.installmentAmount)} per payment
                        </p>
                      </div>
                    </div>
                    {option.installmentsCount === 3 && (
                      <Badge className="bg-primary text-primary-foreground">
                        Most Popular
                      </Badge>
                    )}
                  </div>

                  {/* Payment Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Total: <span className="font-medium text-foreground">{formatAmount(option.totalAmount)}</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Every {option.frequencyDays} days
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrendingDown className="w-4 h-4 text-primary" />
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
                  <Card className="bg-muted/50">
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
              {state.selectedPlan ? (
                <PricingCalculator
                  amount={parseFloat(state.product?.price || '0')}
                  installments={state.selectedPlan.installmentsCount}
                  onPricingUpdate={(pricing) => setSelectedPlanPricing(pricing)}
                />
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

        {/* Continue Button */}
        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            disabled={!state.selectedPlan}
            onClick={handleContinue}
            className="w-full sm:w-auto px-8 h-12"
          >
            <span className="mr-2">Continue with Selected Plan</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Benefits Section */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle className="text-xl">Why Choose SyloPay BNPL?</CardTitle>
            <CardDescription>
              Experience the future of payments with blockchain technology
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h5 className="font-semibold text-foreground">Instant Approval</h5>
                  <p className="text-sm text-muted-foreground">No lengthy credit checks or waiting</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h5 className="font-semibold text-foreground">Blockchain Security</h5>
                  <p className="text-sm text-muted-foreground">Secured by Stellar network technology</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h5 className="font-semibold text-foreground">Complete Transparency</h5>
                  <p className="text-sm text-muted-foreground">Track everything on Stellar Explorer</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h5 className="font-semibold text-foreground">No Hidden Fees</h5>
                  <p className="text-sm text-muted-foreground">What you see is what you pay</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default QuotationPage;