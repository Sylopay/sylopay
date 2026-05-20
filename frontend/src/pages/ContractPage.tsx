import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Check, CreditCard, Shield, ArrowRight, Calculator, TrendingDown, Info, Wallet, AlertCircle, ExternalLink } from 'lucide-react';
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
import { SyloPayPrivacyPolicyContent, TermsOfServiceContent } from '../content/LegalContent';
import { isConnected } from '@stellar/freighter-api';


// ─── Utilitários de Máscara ──────────────────────────────────────────────────
const maskCPF = (value: string) => value;

const maskPhone = (value: string) => {
  let v = value.replace(/\D/g, '');
  if (v.startsWith('55')) v = v.slice(2);
  v = v.slice(0, 11);
  if (v.length === 0) return '';
  if (v.length <= 2) return `+55 (${v}`;
  if (v.length <= 7) return `+55 (${v.slice(0, 2)}) ${v.slice(2)}`;
  return `+55 (${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
};

// ─── Utilitários de Validação ────────────────────────────────────────────────
const isValidEmail = (email: string) => email.trim().length > 0;

const isValidStellarKey = (key: string) => /^G[A-Z0-9]{55}$/.test(key);

const isValidCPF = (cpf: string) => cpf.trim().length > 0;

// ─── Componente Principal ────────────────────────────────────────────────────
export function ContractPage() {
  const { state, actions } = useBNPL();
  const navigate = useNavigate();

  // Redirect to Freighter official page if not installed
  useEffect(() => {
    const checkFreighterWallet = async () => {
      try {
        const hasFreighter = await isConnected();
        if (!hasFreighter) {
          window.location.href = 'https://www.freighter.app';
        }
      } catch (error) {
        console.error('Error checking Freighter presence:', error);
        window.location.href = 'https://www.freighter.app';
      }
    };
    checkFreighterWallet();
  }, []);
  
  const [formData, setFormData] = useState<Customer>(
    state.customer || {
      stellarPublicKey: 'GA57YQCS5NV4TXQPXR6DIKDYTQCMODQ3HNFKJZOULEE7M74SZ6RAIVLA',
      email: 'demo@hackathon.stellar',
      fullName: 'Demo Customer',
      phone: '+55 (11) 99999-9999',
      documentNumber: '123.456.789-00'
    }
  );

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const [pricingBreakdown, setPricingBreakdown] = useState<PricingBreakdown | null>(null);
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | null>(null);
  const [walletConnected, setWalletConnected] = useState(true);
  const [walletType, setWalletType] = useState<string>('demo');

  // Validação em tempo real
  useEffect(() => {
    const newErrors: Record<string, string> = {};
    if (formData.email && !isValidEmail(formData.email)) newErrors.email = 'Please enter a valid email address.';
    if (formData.documentNumber && !isValidCPF(formData.documentNumber)) newErrors.documentNumber = 'Invalid CPF format.';
    if (formData.stellarPublicKey && !isValidStellarKey(formData.stellarPublicKey)) newErrors.stellarPublicKey = 'Invalid Stellar Public Key. Must start with G and have 56 characters.';
    if (formData.fullName && formData.fullName.trim().split(' ').length < 2) newErrors.fullName = 'Please enter your full name.';
    setErrors(newErrors);
  }, [formData]);

  useEffect(() => {
    const calculatePricing = async () => {
      if (!state.product || !state.selectedPlan) return;
      try {
        const pricing = await pricingService.calculateDynamicPricing(
          parseFloat(state.product.price),
          state.selectedPlan.installmentsCount
        );
        setPricingBreakdown(pricing);
      } catch (error) {
        console.error('Error calculating pricing:', error);
      }
    };
    calculatePricing();
  }, [state.product, state.selectedPlan]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let maskedValue = value;

    if (name === 'documentNumber') maskedValue = maskCPF(value);
    if (name === 'phone') maskedValue = maskPhone(value);

    setFormData(prev => ({ ...prev, [name]: maskedValue }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched(prev => ({ ...prev, [e.target.name]: true }));
  };

  const handleWalletSelect = (publicKey: string, walletType: string, walletName: string) => {
    setFormData(prev => ({ ...prev, stellarPublicKey: publicKey }));
    setWalletConnected(true);
    setWalletType(walletType);
  };

  const isFormValid = 
    formData.fullName && 
    formData.email && 
    formData.stellarPublicKey && 
    formData.documentNumber && 
    termsAccepted && 
    Object.keys(errors).length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      // Força o "touched" em todos os campos se tentar enviar inválido
      const allTouched = Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {});
      setTouched(allTouched);
      return;
    }
    actions.setCustomer(formData);
    actions.nextStep();
    navigate('/processing');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-200">
      {/* Header */}
      <header className="border-b border-zinc-800/60 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button variant="ghost" onClick={() => window.history.back()} className="flex items-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-3">
              <Logo size="sm" className="text-orange-500" />
              <h1 className="text-sm font-medium text-zinc-100">Customer Information</h1>
            </div>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-2 uppercase tracking-wider font-semibold">
            <span>Step 3 of 5</span>
            <span className="text-orange-500">60% Complete</span>
          </div>
          <div className="h-1 bg-zinc-800/80 rounded-full overflow-hidden">
            <div className="h-full bg-orange-600 rounded-full w-[60%] transition-all duration-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Wallet Connection */}
            <Card className="bg-[#121212] border-zinc-800/80">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-zinc-100 text-base">
                  <Wallet className="w-5 h-5 mr-2 text-orange-500" />
                  Connect Your Stellar Wallet
                </CardTitle>
                <CardDescription className="text-zinc-400 text-xs">
                  Choose how you'd like to connect your Stellar account for this BNPL contract
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <WalletConnector
                  selectedPublicKey={formData.stellarPublicKey}
                  onWalletSelect={handleWalletSelect}
                />
                
                {formData.stellarPublicKey && (
                  <div className="mt-4 p-4 rounded-xl bg-orange-950/10 border border-orange-500/20 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-500 flex items-center">
                        <Check className="w-3.5 h-3.5 mr-1.5 text-green-500" />
                        Connected Account Status
                      </span>
                      <Badge variant="outline" className="text-[9px] border-orange-500/30 text-orange-500 bg-orange-950/20 font-mono">
                        {walletType === 'freighter' ? 'Freighter Wallet' : 'Demo Mode Wallet'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3 bg-[#0a0a0a] border border-zinc-800/60 rounded-lg px-3 py-2.5">
                      <div className="font-mono text-[11px] text-zinc-300 truncate select-all">
                        {formData.stellarPublicKey}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(formData.stellarPublicKey);
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-2 flex items-center justify-between">
                      <span>Network: <strong className="text-zinc-400">Stellar Testnet</strong></span>
                      <a
                        href={`https://stellar.expert/explorer/testnet/account/${formData.stellarPublicKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-500 hover:underline flex items-center"
                      >
                        Stellar.Expert <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#121212] border-zinc-800/80">
              <CardHeader>
                <CardTitle className="flex items-center text-zinc-100 text-base">
                  <User className="w-5 h-5 mr-2 text-orange-500" />
                  Personal Information
                </CardTitle>
                <CardDescription className="text-zinc-400 text-xs">
                  Please provide your details to create the BNPL contract
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label htmlFor="fullName" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Full Name *
                      </label>
                      <Input
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="Enter your full name"
                        className={`h-11 bg-[#0a0a0a] border ${touched.fullName && errors.fullName ? 'border-red-500 focus-visible:ring-red-500' : 'border-zinc-800 focus-visible:ring-orange-500'} text-zinc-200 placeholder:text-zinc-600`}
                      />
                      {touched.fullName && errors.fullName && (
                        <p className="text-[10px] text-red-400 flex items-center mt-1">
                          <AlertCircle className="w-3 h-3 mr-1" /> {errors.fullName}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Email Address *
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="your@email.com"
                        className={`h-11 bg-[#0a0a0a] border ${touched.email && errors.email ? 'border-red-500 focus-visible:ring-red-500' : 'border-zinc-800 focus-visible:ring-orange-500'} text-zinc-200 placeholder:text-zinc-600`}
                      />
                      {touched.email && errors.email && (
                        <p className="text-[10px] text-red-400 flex items-center mt-1">
                          <AlertCircle className="w-3 h-3 mr-1" /> {errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Phone */}
                    <div className="space-y-1.5">
                      <label htmlFor="phone" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Phone Number *
                      </label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+55 (11) 99999-9999"
                        className="h-11 bg-[#0a0a0a] border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-orange-500"
                      />
                    </div>

                    {/* Document / CPF */}
                    <div className="space-y-1.5">
                      <label htmlFor="documentNumber" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Document (CPF) *
                      </label>
                      <Input
                        id="documentNumber"
                        name="documentNumber"
                        value={formData.documentNumber}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="000.000.000-00"
                        className={`h-11 bg-[#0a0a0a] border ${touched.documentNumber && errors.documentNumber ? 'border-red-500 focus-visible:ring-red-500' : 'border-zinc-800 focus-visible:ring-orange-500'} text-zinc-200 placeholder:text-zinc-600`}
                      />
                      {touched.documentNumber && errors.documentNumber && (
                        <p className="text-[10px] text-red-400 flex items-center mt-1">
                          <AlertCircle className="w-3 h-3 mr-1" /> {errors.documentNumber}
                        </p>
                      )}
                    </div>
                  </div>



                  {/* Terms and Conditions */}
                  <Card className="bg-[#0a0a0a] border-zinc-800">
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="terms"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-zinc-700 bg-zinc-900 rounded accent-orange-600 cursor-pointer"
                        />
                        <div className="text-sm">
                          <label htmlFor="terms" className="font-medium text-zinc-200 cursor-pointer">
                            I agree to the Terms and Conditions
                          </label>
                          <p className="text-xs text-zinc-500 mt-1">
                            By checking this box, you agree to our{' '}
                            <button type="button" onClick={() => setActiveModal('terms')} className="text-orange-500 hover:text-orange-400 hover:underline">
                              Terms of Service
                            </button>
                            {' '}and{' '}
                            <button type="button" onClick={() => setActiveModal('privacy')} className="text-orange-500 hover:text-orange-400 hover:underline">
                              Privacy Policy
                            </button>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Button
                    type="submit"
                    disabled={!isFormValid}
                    className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white border-none shadow-lg shadow-orange-900/20 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all font-semibold"
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
            <Card className="sticky top-24 w-full bg-[#121212] border-zinc-800/80">
              <CardHeader className="pb-4 border-b border-zinc-800/50">
                <CardTitle className="flex items-center text-sm text-zinc-100">
                  <CreditCard className="w-4 h-4 mr-2 text-zinc-400" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                
                {/* Product */}
                <div className="flex items-center space-x-3 p-3 bg-[#0a0a0a] border border-zinc-800 rounded-xl">
                  <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800">
                    <span className="text-lg">📱</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs text-zinc-200 truncate">{state.product?.name}</p>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mt-0.5">Premium smartphone</p>
                  </div>
                </div>

                {/* Pricing Details */}
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Product Price:</span>
                    <span className="font-medium text-zinc-300">
                      USDC {state.product
                        ? (parseFloat(state.product.price) / 5.7).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '0.00'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-zinc-500">Payment Plan:</span>
                    <span className="font-medium text-zinc-300">
                      {state.selectedPlan?.installmentsCount}x installments
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-zinc-500">Each Payment:</span>
                    <span className="font-medium text-zinc-300">
                      USDC {state.selectedPlan
                        ? parseFloat(state.selectedPlan.installmentAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '0.00'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-zinc-500">Interest Rate:</span>
                    <span className="font-medium text-green-500">
                      {pricingBreakdown
                        ? `${pricingBreakdown.consumerInterestRate.toFixed(2)}% APR`
                        : state.selectedPlan?.interestRate
                        ? `${parseFloat(state.selectedPlan.interestRate).toFixed(2)}% APR`
                        : 'Calculating...'}
                    </span>
                  </div>

                  <div className="border-t border-zinc-800/50 pt-3 mt-3">
                    <div className="flex justify-between font-bold text-sm">
                      <span className="text-zinc-200">Total You'll Pay:</span>
                      <span className="text-orange-500">
                        USDC {pricingBreakdown
                          ? (pricingBreakdown.totalConsumerPayment / 5.7).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : state.selectedPlan
                          ? parseFloat(state.selectedPlan.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : '0.00'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fee Breakdown Lite */}
                {pricingBreakdown && (
                  <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-lg p-3 mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 flex items-center">
                        <TrendingDown className="w-3 h-3 mr-1" />
                        Blend Protocol
                      </span>
                      <span className="text-[10px] text-indigo-300 bg-indigo-900/40 px-1.5 py-0.5 rounded">
                        {pricingBreakdown.savings.competitiveAdvantage}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-indigo-200/70 border-t border-indigo-900/30 pt-2">
                      <span>Pool Utilization</span>
                      <span className="font-mono">{pricingService.formatPercent(pricingBreakdown.blendPoolUtilization)}</span>
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-3">
                  <h4 className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 flex items-center mb-3">
                    <Shield className="w-3 h-3 mr-1.5" />
                    What Happens Next
                  </h4>
                  <ul className="space-y-2 text-[11px] text-zinc-400">
                    <li className="flex items-start">
                      <Check className="w-3.5 h-3.5 mr-2 text-green-500 flex-shrink-0" />
                      Smart contract creation
                    </li>
                    <li className="flex items-start">
                      <Check className="w-3.5 h-3.5 mr-2 text-green-500 flex-shrink-0" />
                      Instant payment to merchant
                    </li>
                    <li className="flex items-start">
                      <Check className="w-3.5 h-3.5 mr-2 text-green-500 flex-shrink-0" />
                      Blockchain verification via Soroban
                    </li>
                  </ul>
                </div>
                
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