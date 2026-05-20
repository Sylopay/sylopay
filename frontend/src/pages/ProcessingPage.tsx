/**
 * ProcessingPage.tsx
 * Phase 3: Real integration with Etherfuse (on-ramp Pix) + Soroban (on-chain contract)
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, ExternalLink, AlertCircle, Zap, Shield,
  CreditCard, Link2, Building2, Coins, ScrollText
} from 'lucide-react';
import { useBNPL } from '../hooks/useBNPL';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import LoadingSpinner from '../components/LoadingSpinner';
import Logo from '../components/Logo';
import { PixPayment } from '../components/PixPayment';
import { DEMO_MERCHANT } from '../types';
import { signTransaction } from '@stellar/freighter-api';
import pricingService from '../services/pricingService';
import { Badge } from '../components/ui/badge';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  txHash?: string;
  explorerUrl?: string;
}

interface PixData {
  pixKey: string;
  amountBRL: number;
  expiresAt: string;
  orderId: string;
  quoteId: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProcessingPage() {
  const { state, actions } = useBNPL();
  const navigate = useNavigate();

  const [steps, setSteps] = useState<ProcessingStep[]>([
    {
      id: 'validation',
      title: 'Validating data',
      description: 'Verifying customer information and selected plan',
      status: 'processing',
    },
    {
      id: 'soroban',
      title: 'Creating on-chain contract',
      description: 'Registering BNPL contract on Stellar (Soroban)',
      status: 'pending',
    },
    {
      id: 'pix',
      title: 'Generating Pix key',
      description: 'Preparing payment order via Etherfuse API',
      status: 'pending',
    },
    {
      id: 'payment',
      title: 'Awaiting payment routing',
      description: 'BRL → TESOURO (Etherfuse) → USDC',
      status: 'pending',
    },
    {
      id: 'completion',
      title: 'Finalizing',
      description: 'Installment registered on-chain — ready!',
      status: 'pending',
    },
  ]);

  const [pixData, setPixData] = useState<PixData | null>(null);
  const [showPix, setShowPix] = useState(false);
  const processingStarted = useRef(false);
  const [started, setStarted] = useState(false);
  const [sorobanContractId, setSorobanContractId] = useState<string | undefined>();
  const [sorobanTxHash, setSorobanTxHash] = useState<string | undefined>();

  // ─── Utilities ─────────────────────────────────────────────────────────────

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  const updateStep = (id: string, patch: Partial<ProcessingStep>) => {
    setSteps(prev =>
      prev.map(s => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  // ─── Main Flow ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (started) return;

    const run = async () => {
      if (processingStarted.current) return;
      processingStarted.current = true;
      setStarted(true);

      if (!state.customer || !state.selectedPlan || !state.product) {
        actions.setError('Incomplete data to process the contract');
        return;
      }

      try {
        // ── Step 1: Validation ──────────────────────────────────────────────────
        await delay(2000);
        updateStep('validation', { status: 'completed' });

        // ── Step 2: Create Soroban on-chain contract ────────────────────────────
        updateStep('soroban', { status: 'processing' });

        const totalUsdc = pricingService.convertToAsset(
          parseFloat(state.selectedPlan.totalAmount),
          'USDC'
        );

        const createRes = await fetch('/api/soroban/create-contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantPublicKey: DEMO_MERCHANT.publicKey,
            customerPublicKey: state.customer.stellarPublicKey,
            totalAmountUsdc: totalUsdc,
            installmentsCount: state.selectedPlan.installmentsCount,
          }),
        });

        if (!createRes.ok) {
          const errData = await createRes.json();
          throw new Error(`Failed to create contract on Soroban: ${errData.error || createRes.status}`);
        }

        const sorobanData = await createRes.json();
        setSorobanContractId(sorobanData.contratoId);
        setSorobanTxHash(sorobanData.txHash);

        updateStep('soroban', {
          status: 'completed',
          txHash: sorobanData.txHash,
          explorerUrl: sorobanData.explorerUrl,
        });

        actions.setContract({
          id: sorobanData.contratoId,
          stellarTxHash: sorobanData.txHash,
          explorerUrl: sorobanData.explorerUrl,
          status: 'active',
        });

        await delay(1500);

        // ── Step 3: Generate Pix quote + order (Etherfuse) ───────────────────────
        updateStep('pix', { status: 'processing' });

        // CÁLCULO EXATO DO PIX (USDC -> BRL)
        const EXCHANGE_RATE = 5.20;
        const installmentAmountUSDC = parseFloat(state.selectedPlan.installmentAmount);
        const calculatedAmountBRL = installmentAmountUSDC * EXCHANGE_RATE;

        const quoteRes = await fetch('/api/etherfuse/quote-onramp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount_brl: calculatedAmountBRL.toFixed(2), // Enviando o valor calculado em BRL
            wallet_address: state.customer.stellarPublicKey,
          }),
        });

        if (!quoteRes.ok) {
          const errorText = await quoteRes.text();
          let backendErrorDetail = errorText;
          try {
            const errorBody = JSON.parse(errorText);
            backendErrorDetail = errorBody.message || errorBody.error || errorText;
          } catch (e) {}
          throw new Error(`Failed to create Etherfuse quote: ${backendErrorDetail}`);
        }

        const quoteData = await quoteRes.json();
        const quoteId = quoteData.quote?.quoteId;

        const orderRes = await fetch('/api/etherfuse/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quoteId }),
        });

        if (!orderRes.ok) {
          throw new Error(`Failed to create Etherfuse order: ${orderRes.status}`);
        }

        const orderData = await orderRes.json();
        const order = orderData.order;
        const pix = order?.paymentInstructions;

        const pixKey = pix?.pixKey || quoteId || `pix_${order?.id || Date.now()}`;
        const expiresAt = pix?.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString();

        setPixData({
          pixKey,
          amountBRL: calculatedAmountBRL, // Forçando o UI a renderizar o nosso cálculo real
          expiresAt,
          orderId: order?.id || quoteId,
          quoteId,
        });

        updateStep('pix', { status: 'completed' });
        updateStep('payment', { status: 'processing' });
        setShowPix(true);

      } catch (error) {
        console.error('[ProcessingPage] Error:', error);
        actions.setError(
          error instanceof Error ? error.message : 'Processing error occurred'
        );
        setSteps(prev =>
          prev.map(s => (s.status === 'processing' ? { ...s, status: 'error' } : s))
        );
      }
    };

    run();
  }, []);

  // ─── Payment Callbacks ──────────────────────────────────────────────────

  const handlePixConfirmed = async (txHash?: string) => {
    updateStep('payment', { status: 'completed', txHash });
    updateStep('completion', { status: 'processing' });

    try {
      if (sorobanContractId) {
        await fetch('/api/soroban/confirm-first-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contratoId: sorobanContractId,
            txHash: txHash || 'pix_confirmed'
          }),
        });
      }
    } catch (err) {
      console.warn('[ProcessingPage] Failed to confirm on-chain, but Pix was paid:', err);
    }

    await delay(1000);
    updateStep('completion', { status: 'completed' });

    setTimeout(() => {
      actions.nextStep();
      navigate('/dashboard');
    }, 2000);
  };

  // ─── UI Helpers ────────────────────────────────────────────────────────────

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing': return <LoadingSpinner size="sm" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <div className="w-5 h-5 border-2 border-zinc-700 rounded-full" />;
    }
  };

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progressPct = (completedCount / steps.length) * 100;
  const allCompleted = steps.every(s => s.status === 'completed');
  const hasError = steps.some(s => s.status === 'error');

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-200">
      <header className="border-b border-zinc-800/60 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Logo size="md" className="animate-pulse text-orange-500" />
              <h1 className="text-sm font-medium text-zinc-100">Processing Payment</h1>
            </div>
            <div className="w-8"></div> {/* Spacer for alignment */}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-2 uppercase tracking-wider font-semibold">
            <span>Step 4 of 5</span>
            <span>{progressPct.toFixed(0)}% Complete</span>
          </div>
          <div className="h-1 bg-zinc-800/80 rounded-full overflow-hidden">
            <div className="h-full bg-orange-600 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Processing Area */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-[#121212] border-zinc-800/80">
              <CardHeader>
                <CardTitle className="flex items-center text-zinc-100">
                  <Zap className="w-5 h-5 mr-2 text-orange-500" />
                  BNPL Contract Processing
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Contract created on-chain via Soroban · Payment via Pix (Etherfuse)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className={`
                      flex items-center space-x-4 p-3 rounded-lg transition-all border
                      ${step.status === 'processing' ? 'bg-[#14100c] border-orange-600/30' : 'bg-transparent border-transparent'}
                      ${step.status === 'error' ? 'bg-red-950/20 border-red-900/30' : ''}
                      ${step.status === 'completed' ? 'bg-green-950/10 border-green-900/20' : ''}
                      ${step.status === 'pending' ? 'opacity-40' : ''}
                    `}
                  >
                    <div className="flex-shrink-0">{getStepIcon(step)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-semibold ${step.status === 'completed' ? 'text-green-500' :
                          step.status === 'processing' ? 'text-orange-500' :
                            step.status === 'error' ? 'text-red-400' :
                              'text-zinc-400'
                        }`}>
                        {step.title}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">{step.description}</p>

                      {step.status === 'completed' && step.txHash && (
                        <a
                          href={step.explorerUrl || `https://stellar.expert/explorer/testnet/tx/${step.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-orange-500/80 hover:text-orange-400 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View on Stellar Explorer
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {showPix && pixData && !allCompleted && !hasError && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <PixPayment
                  pixKey={pixData.pixKey}
                  amountBRL={pixData.amountBRL}
                  expiresAt={pixData.expiresAt}
                  orderId={pixData.orderId}
                  onConfirmed={handlePixConfirmed}
                  onExpired={() => actions.setError('Pix Key Expired. Try again.')}
                />
              </div>
            )}

            {allCompleted && (
              <Card className="border-green-500/30 bg-green-500/10">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                    <div>
                      <h3 className="text-base font-semibold text-green-400">
                        BNPL Contract created successfully!
                      </h3>
                      <p className="text-green-500/70 text-xs mt-1">
                        Your contract is registered on Stellar. Redirecting to dashboard...
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {hasError && (
              <Card className="border-red-900/40 bg-[#1a0a0a]">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                    <div>
                      <h3 className="text-base font-semibold text-red-400">Processing error</h3>
                      <p className="text-red-400/80 text-xs mt-1">
                        {state.error || 'An error occurred. Please try again.'}
                      </p>
                      <div className="flex gap-3 mt-4">
                        <Button variant="outline" size="sm" onClick={actions.prevStep} className="border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                          Back
                        </Button>
                        <Button size="sm" onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 text-white">
                          Try Again
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* SIDEBAR */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Transparency Panel: What happens to the Pix? */}
            <Card className="bg-gradient-to-b from-[#121212] to-[#0a0a0a] border-zinc-800/80 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Shield className="w-24 h-24 text-zinc-100" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center text-zinc-200">
                  <Shield className="w-4 h-4 mr-2 text-indigo-400" />
                  How your payment works
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  We use blockchain for maximum security and transparency. Here is the path of your money:
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 pb-5 space-y-0">
                
                {/* Flow UI */}
                <div className="flex flex-col relative z-10">
                  <div className="flex items-start gap-3 pb-4">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 z-10">
                      <Zap className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                    <div className="pt-1.5">
                      <p className="text-xs font-medium text-zinc-300">You pay via standard Pix in BRL</p>
                    </div>
                  </div>
                  
                  <div className="absolute left-[15px] top-[30px] bottom-[30px] w-0.5 bg-zinc-800 z-0"></div>

                  <div className="flex items-start gap-3 pb-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 z-10">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div className="pt-1.5">
                      <p className="text-xs font-medium text-zinc-300">Etherfuse (Regulated Anchor) converts to Digital Asset</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pb-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0 z-10">
                      <Coins className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div className="pt-1.5">
                      <p className="text-xs font-medium text-zinc-300">Swapped to USDC on Stellar Network</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center flex-shrink-0 z-10">
                      <ScrollText className="w-3.5 h-3.5 text-orange-400" />
                    </div>
                    <div className="pt-1.5">
                      <p className="text-xs font-medium text-zinc-300">Locked securely in Soroban Smart Contract</p>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* On-Chain Contract Summary */}
            {sorobanContractId && (
              <Card className="bg-[#121212] border-zinc-800/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center text-zinc-200">
                    <Link2 className="w-4 h-4 mr-2 text-orange-500" />
                    On-chain Contract
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Contract ID</label>
                    <p className="font-mono text-xs break-all mt-1 bg-[#0a0a0a] border border-zinc-800 p-2 rounded text-zinc-300">
                      {sorobanContractId}
                    </p>
                  </div>
                  {sorobanTxHash && (
                    <div>
                      <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">TX Hash</label>
                      <p className="font-mono text-xs break-all mt-1 text-orange-400/80">
                        {sorobanTxHash.slice(0, 20)}...
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Network</label>
                    <div className="flex items-center mt-1 gap-2">
                      <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">Stellar Testnet</Badge>
                      <Badge variant="outline" className="text-[10px] border-purple-500/30 bg-purple-500/10 text-purple-400">
                        Soroban
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-[#121212] border-zinc-800/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center text-zinc-200">
                  <CreditCard className="w-4 h-4 mr-2 text-zinc-400" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Product:</span>
                  <span className="font-medium text-zinc-300 text-right max-w-[120px] truncate">{state.product?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Total:</span>
                  <span className="font-medium text-zinc-300">{state.selectedPlan ? `${parseFloat(state.selectedPlan.totalAmount).toFixed(2)} USDC` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Installments:</span>
                  <span className="font-medium text-zinc-300">{state.selectedPlan?.installmentsCount}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Each installment:</span>
                  <span className="font-medium text-zinc-300">{state.selectedPlan ? `${parseFloat(state.selectedPlan.installmentAmount).toFixed(2)} USDC` : '—'}</span>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}

export default ProcessingPage;