import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, FileText, Check, CreditCard, Shield, ArrowRight, Calculator, TrendingDown, Info, Wallet } from 'lucide-react';
import { useBNPL } from '../hooks/useBNPL';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import Logo from '../components/Logo';
import WalletConnector from '../components/WalletConnector';
import { Customer } from '../types';
import pricingService, { PricingBreakdown } from '../services/pricingService';


import { LegalModal } from '../components/LegalModel';
import { SyloPayPrivacyPolicyContent, TermsOfServiceContent} from '../content/LegalContent';


export function ContractPage() {
  const { state, actions } = useBNPL();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Customer>(
    state.customer || {
      stellarPublicKey: 'GA57YQCS5NV4TXQPXR6DIKDYTQCMODQ3HNFKJZOULEE7M74SZ6RAIVLA',
      email: 'demo@hackathon.stellar',
      fullName: 'Demo Customer',
      phone: '+55 11 99999-9999',
      documentNumber: '123.456.789-00'
    }
  );
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pricingBreakdown, setPricingBreakdown] = useState<PricingBreakdown | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | null>(null);
  const [walletConnected, setWalletConnected] = useState(true); // Start as connected with demo
  const [walletType, setWalletType] = useState<string>('demo');

  useEffect(() => {
    const calculatePricing = async () => {
      if (!state.product || !state.selectedPlan) return;
      
      setLoadingPricing(true);
      try {
        const pricing = await pricingService.calculateDynamicPricing(
          parseFloat(state.product.price),
          state.selectedPlan.installmentsCount
        );
        setPricingBreakdown(pricing);
      } catch (error) {
        console.error('Error calculating pricing:', error);
      } finally {
        setLoadingPricing(false);
      }
    };

    calculatePricing();
  }, [state.product, state.selectedPlan]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleWalletSelect = (publicKey: string, walletType: string, walletName: string) => {
    setFormData(prev => ({ ...prev, stellarPublicKey: publicKey }));
    setWalletConnected(true);
    setWalletType(walletType);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) return;
    
    actions.setCustomer(formData);
    actions.nextStep(); // Go to processing
    navigate('/processing');
  };

  const isFormValid = formData.fullName && formData.email && formData.stellarPublicKey && termsAccepted;

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
              <h1 className="text-lg font-semibold">Customer Information</h1>
            </div>
            <div className="w-16" />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Step 3 of 5</span>
            <span>60% Complete</span>
          </div>
          <Progress value={60} className="h-2" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wallet Connection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wallet className="w-5 h-5 mr-2" />
                  Connect Your Stellar Wallet
                </CardTitle>
                <CardDescription>
                  Choose how you'd like to connect your Stellar account for this BNPL contract
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WalletConnector
                  selectedPublicKey={formData.stellarPublicKey}
                  onWalletSelect={handleWalletSelect}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Please provide your details to create the BNPL contract
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="fullName" className="text-sm font-medium">
                        Full Name *
                      </label>
                      <Input
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="Enter your full name"
                        required
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium">
                        Email Address *
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="your@email.com"
                        required
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="phone" className="text-sm font-medium">
                        Phone Number
                      </label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+55 11 99999-9999"
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="documentNumber" className="text-sm font-medium">
                        Document Number
                      </label>
                      <Input
                        id="documentNumber"
                        name="documentNumber"
                        value={formData.documentNumber}
                        onChange={handleInputChange}
                        placeholder="000.000.000-00"
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="stellarPublicKey" className="text-sm font-medium">
                      Stellar Public Key *
                    </label>
                    <div className="relative">
                      <Input
                        id="stellarPublicKey"
                        name="stellarPublicKey"
                        value={formData.stellarPublicKey}
                        onChange={handleInputChange}
                        placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                        required
                        readOnly={walletConnected && walletType !== 'manual'}
                        className={`font-mono text-sm h-10 ${
                          walletConnected && walletType !== 'manual' 
                            ? 'bg-muted cursor-not-allowed' 
                            : ''
                        }`}
                      />
                      {walletConnected && walletType !== 'manual' && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Badge variant="secondary" className="text-xs">
                            Connected via {walletType === 'freighter' ? 'Freighter' : 'Demo'}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {walletConnected && walletType !== 'manual'
                        ? `Connected via ${walletType === 'freighter' ? 'Freighter wallet' : 'demo account'}`
                        : 'Your Stellar account public key for receiving payments'
                      }
                    </p>
                  </div>

                  {/* Terms and Conditions */}
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="terms"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-1 h-4 w-4 text-primary focus:ring-primary border-border rounded"
                        />
                        <div className="text-sm">
                          <label htmlFor="terms" className="font-medium">
                            I agree to the Terms and Conditions
                          </label>
                          <p className="text-muted-foreground">
                            By checking this box, you agree to our{' '}
                            <button
                              type="button"
                              onClick={() => setActiveModal('terms')}
                              className="text-primary hover:underline font-medium"
                            >
                              Terms of Service
                            </button>
                            {' '}and{' '}
                            <button
                              type="button"
                              onClick={() => setActiveModal('privacy')}
                              className="text-primary hover:underline font-medium"
                            >
                              Privacy Policy
                            </button>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={!isFormValid}
                    className="w-full h-12"
                  >
                    <span className="mr-2">Create BNPL Contract</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1 flex items-start">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product */}
                <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center">
                    <span className="text-lg">📱</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{state.product?.name}</p>
                    <p className="text-xs text-muted-foreground">Premium smartphone</p>
                  </div>
                </div>

                {/* Pricing Details */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Product Price:</span>
                    <span className="font-medium">
                      BRL {state.product ? parseFloat(state.product.price).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Plan:</span>
                    <span className="font-medium">
                      {state.selectedPlan?.installmentsCount}x installments
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Each Payment:</span>
                    <span className="font-medium">
                      BRL {state.selectedPlan ? parseFloat(state.selectedPlan.installmentAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Interest Rate:</span>
                    <span className="font-medium text-primary">
                      {pricingBreakdown 
                        ? `${pricingBreakdown.consumerInterestRate.toFixed(1)}% APR via Blend`
                        : 'Loading...'
                      }
                    </span>
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total You'll Pay:</span>
                      <span className="text-primary">
                        {pricingBreakdown 
                          ? `BRL ${pricingBreakdown.totalConsumerPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                            : state.selectedPlan
                            ? `BRL ${parseFloat(state.selectedPlan.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                            : 'BRL 0.00'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fee Breakdown */}
                {pricingBreakdown && (
                  <Card className="bg-gradient-to-r from-green-500/5 to-blue-500/5 border-green-500/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span className="flex items-center">
                          <Calculator className="w-4 h-4 mr-2" />
                          Complete Fee Transparency
                        </span>
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 ">
                          <TrendingDown className="w-3 h-3 mr-1" />
                          {pricingBreakdown.savings.competitiveAdvantage}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-4">
                      {/* Merchant Costs */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-semibold text-muted-foreground flex items-center">
                          <Info className="w-3 h-3 mr-1" />
                          What the Merchant Pays
                        </h5>
                        <div className="bg-background rounded p-2 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Processing Fee ({pricingService.formatPercent(pricingBreakdown.merchantFee)})</span>
                            <span className="font-medium">{pricingService.formatCrypto(pricingBreakdown.merchantFeeAmount)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Transaction Fee</span>
                            <span className="font-medium">{pricingService.formatCrypto(pricingBreakdown.transactionFee)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-semibold pt-1 border-t">
                            <span>Merchant Total</span>
                            <span className="text-blue-600">{pricingService.formatCrypto(pricingBreakdown.totalMerchantCost)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Consumer Costs */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-semibold text-muted-foreground flex items-center">
                          <Info className="w-3 h-3 mr-1" />
                          What You Pay
                        </h5>
                        <div className="bg-background rounded p-2 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Product Price</span>
                            <span className="font-medium">{pricingService.formatCrypto(pricingBreakdown.originalAmount)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Interest ({pricingService.formatPercent(pricingBreakdown.consumerInterestRate)} APR)</span>
                            <span className="font-medium">{pricingService.formatCrypto(pricingBreakdown.consumerInterestAmount)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-semibold pt-1 border-t">
                            <span>Your Total</span>
                            <span className="text-green-600">{pricingService.formatCrypto(pricingBreakdown.totalConsumerPayment)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Blend Protocol Info */}
                      <div className="bg-primary/5 rounded p-2 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Powered by Blend Protocol
                        </span>
                        <span className="font-medium">
                          Pool: {pricingService.formatPercent(pricingBreakdown.blendPoolUtilization)} utilized
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Next Steps */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      What Happens Next
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-2 text-xs">
                      <li className="flex items-center">
                        <Check className="w-3 h-3 mr-2 text-primary" />
                        Smart contract creation
                      </li>
                      <li className="flex items-center">
                        <Check className="w-3 h-3 mr-2 text-primary" />
                        Instant payment to merchant
                      </li>
                      <li className="flex items-center">
                        <Check className="w-3 h-3 mr-2 text-primary" />
                        Payment schedule setup
                      </li>
                      <li className="flex items-center">
                        <Check className="w-3 h-3 mr-2 text-primary" />
                        Blockchain verification
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
          <LegalModal
        open={activeModal !== null}
        onOpenChange={() => setActiveModal(null)}
        title={activeModal === 'terms' ? 'Terms of Service' : 'SyloPay Privacy Policy'}
      >
        {activeModal === 'terms' && <TermsOfServiceContent />}
        {activeModal === 'privacy' && <SyloPayPrivacyPolicyContent />}
      </LegalModal>
        </div>
        
      </div>
      
    </div>
  );
}

export default ContractPage;