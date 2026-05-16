/**
 * ProcessingPage.tsx
 * Fase 3: Integração real com Etherfuse (on-ramp Pix) + Soroban (contrato on-chain)
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, ExternalLink, AlertCircle, Clock, Zap, Shield,
  CreditCard, ArrowRight, Wallet, Link2
} from 'lucide-react';
import { useBNPL } from '../hooks/useBNPL';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import LoadingSpinner from '../components/LoadingSpinner';
import Logo from '../components/Logo';
import { PixPayment } from '../components/PixPayment';
import { DEMO_MERCHANT } from '../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

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

// ─── Componente ───────────────────────────────────────────────────────────────

export function ProcessingPage() {
  const { state, actions } = useBNPL();
  const navigate = useNavigate();

  const [steps, setSteps] = useState<ProcessingStep[]>([
    {
      id: 'validation',
      title: 'Validando dados',
      description: 'Verificando informações do cliente e plano selecionado',
      status: 'processing',
    },
    {
      id: 'soroban',
      title: 'Criando contrato on-chain',
      description: 'Registrando contrato BNPL na Stellar (Soroban)',
      status: 'pending',
    },
    {
      id: 'pix',
      title: 'Gerando chave Pix',
      description: 'Preparando order de pagamento via Etherfuse',
      status: 'pending',
    },
    {
      id: 'payment',
      title: 'Aguardando pagamento',
      description: 'Confirmação Pix → USDC emitido na wallet Stellar',
      status: 'pending',
    },
    {
      id: 'completion',
      title: 'Finalizando',
      description: 'Parcela registrada on-chain — pronto!',
      status: 'pending',
    },
  ]);

  const [pixData, setPixData]           = useState<PixData | null>(null);
  const [showPix, setShowPix]           = useState(false);
  const [started, setStarted]           = useState(false);
  const [sorobanContractId, setSorobanContractId] = useState<string | undefined>();
  const [sorobanTxHash, setSorobanTxHash]         = useState<string | undefined>();

  // ─── Utilitários ─────────────────────────────────────────────────────────────

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  const updateStep = (id: string, patch: Partial<ProcessingStep>) => {
    setSteps(prev =>
      prev.map(s => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  // ─── Fluxo principal ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (started) return;

    const run = async () => {
      setStarted(true);

      if (!state.customer || !state.selectedPlan || !state.product) {
        actions.setError('Dados incompletos para processar o contrato');
        return;
      }

      try {
        // ── Step 1: Validação ──────────────────────────────────────────────────
        await delay(800);
        updateStep('validation', { status: 'completed' });

        // ── Step 2: Criar contrato Soroban on-chain ────────────────────────────
        updateStep('soroban', { status: 'processing' });
        await delay(500);

        const totalUsdc = parseFloat(state.selectedPlan.totalAmount); // valor em XLM/USDC demo
        const sorobanRes = await fetch('/api/soroban/contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantPublicKey: DEMO_MERCHANT.publicKey,
            customerPublicKey: state.customer.stellarPublicKey,
            totalAmountUsdc: totalUsdc,
            installmentsCount: state.selectedPlan.installmentsCount,
          }),
        });

        if (!sorobanRes.ok) {
          throw new Error(`Falha ao criar contrato on-chain: ${sorobanRes.status}`);
        }

        const sorobanData = await sorobanRes.json();
        setSorobanContractId(sorobanData.contratoId);
        setSorobanTxHash(sorobanData.txHash);

        updateStep('soroban', {
          status: 'completed',
          txHash: sorobanData.txHash,
          explorerUrl: sorobanData.explorerUrl,
        });

        // Atualiza o contrato no estado global com dados on-chain
        actions.setContract({
          id: sorobanData.contratoId,
          stellarTxHash: sorobanData.txHash,
          explorerUrl: sorobanData.explorerUrl,
          status: 'active',
        });

        await delay(600);

        // ── Step 3: Gerar quote + order Pix ───────────────────────────────────
        updateStep('pix', { status: 'processing' });

        const installmentAmountBRL = parseFloat(state.selectedPlan.installmentAmount);

        const quoteRes = await fetch('/api/etherfuse/quote-onramp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount_brl: installmentAmountBRL,
            wallet_address: state.customer.stellarPublicKey,
          }),
        });

        if (!quoteRes.ok) {
          throw new Error(`Falha ao criar quote Etherfuse: ${quoteRes.status}`);
        }

        const quoteData = await quoteRes.json();
        const quoteId = quoteData.quote?.id;

        const orderRes = await fetch('/api/etherfuse/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quoteId }),
        });

        if (!orderRes.ok) {
          throw new Error(`Falha ao criar order Etherfuse: ${orderRes.status}`);
        }

        const orderData = await orderRes.json();
        const order = orderData.order;
        const pix = order?.paymentInstructions;

        // Monta dados Pix — usa fallback quando sandbox não retorna chave real
        const pixKey = pix?.pixKey || quoteId || `pix_${order?.id || Date.now()}`;
        const expiresAt = pix?.expiresAt
          || new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min fallback

        setPixData({
          pixKey,
          amountBRL: pix?.amount || installmentAmountBRL,
          expiresAt,
          orderId: order?.id || quoteId,
          quoteId,
        });

        updateStep('pix', { status: 'completed' });
        updateStep('payment', { status: 'processing' });

        // Exibe o componente Pix
        setShowPix(true);

      } catch (error) {
        console.error('[ProcessingPage] Error:', error);
        actions.setError(
          error instanceof Error ? error.message : 'Erro ao processar pagamento'
        );
        setSteps(prev =>
          prev.map(s => (s.status === 'processing' ? { ...s, status: 'error' } : s))
        );
      }
    };

    run();
  }, []);

  // ─── Callback quando Pix confirmado ──────────────────────────────────────────

  const handlePixConfirmed = async (txHash?: string) => {
    updateStep('payment', { status: 'completed', txHash });
    updateStep('completion', { status: 'processing' });

    await delay(1000);
    updateStep('completion', { status: 'completed' });

    // Aguarda 2s para o usuário ver o sucesso e redireciona
    setTimeout(() => {
      actions.nextStep();
      navigate('/dashboard');
    }, 2000);
  };

  // ─── Helpers de UI ────────────────────────────────────────────────────────────

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed': return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'processing': return <LoadingSpinner size="sm" />;
      case 'error':     return <AlertCircle className="w-6 h-6 text-destructive" />;
      default:          return <div className="w-6 h-6 border-2 border-muted rounded-full" />;
    }
  };

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progressPct    = (completedCount / steps.length) * 100;
  const allCompleted   = steps.every(s => s.status === 'completed');
  const hasError       = steps.some(s => s.status === 'error');

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16">
            <div className="flex items-center space-x-3">
              <Logo size="md" className="animate-pulse" />
              <h1 className="text-lg font-semibold">Processando Pagamento</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Etapa 4 de 5</span>
            <span>{progressPct.toFixed(0)}% Concluído</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Etapas + Pix */}
          <div className="lg:col-span-2 space-y-6">

            {/* Steps */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-primary" />
                  Processamento do Contrato BNPL
                </CardTitle>
                <CardDescription>
                  Contrato criado on-chain via Soroban · Pagamento via Pix (Etherfuse)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className={`
                      flex items-start space-x-4 p-4 rounded-lg transition-all
                      ${step.status === 'processing' ? 'bg-primary/5 border border-primary/20' : ''}
                      ${step.status === 'error'      ? 'bg-destructive/5 border border-destructive/20' : ''}
                      ${step.status === 'completed'  ? 'bg-green-500/5 border border-green-500/20' : ''}
                      ${step.status === 'pending'    ? 'opacity-50' : ''}
                    `}
                  >
                    <div className="flex-shrink-0 mt-1">{getStepIcon(step)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-base font-semibold ${
                        step.status === 'completed'  ? 'text-green-600' :
                        step.status === 'processing' ? 'text-primary' :
                        step.status === 'error'      ? 'text-destructive' :
                        'text-muted-foreground'
                      }`}>
                        {step.title}
                      </h3>
                      <p className="text-sm mt-1 text-muted-foreground">{step.description}</p>

                      {/* Link para explorer quando há txHash */}
                      {step.status === 'completed' && step.txHash && (
                        <a
                          href={
                            step.explorerUrl ||
                            `https://stellar.expert/explorer/testnet/tx/${step.txHash}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ver no Stellar Explorer
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Componente Pix */}
            {showPix && pixData && !allCompleted && !hasError && (
              <PixPayment
                pixKey={pixData.pixKey}
                amountBRL={pixData.amountBRL}
                expiresAt={pixData.expiresAt}
                orderId={pixData.orderId}
                onConfirmed={handlePixConfirmed}
                onExpired={() => actions.setError('Chave Pix expirou. Tente novamente.')}
              />
            )}

            {/* Sucesso */}
            {allCompleted && (
              <Card className="border-green-500/20 bg-green-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-green-700">
                        Contrato BNPL criado com sucesso!
                      </h3>
                      <p className="text-green-600/80 text-sm mt-1">
                        Seu contrato está registrado na Stellar. Redirecionando para o dashboard...
                      </p>
                      {sorobanContractId && (
                        <a
                          href="https://stellar.expert/explorer/testnet/contract/CDJFOVTWLKX7EF7VSLRV5MYEHH2HS4T3QG6XKYHHOQXSS66QDNMYHWFG"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-3 text-xs text-green-700 underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ver contrato on-chain
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Erro */}
            {hasError && (
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-destructive">Erro no processamento</h3>
                      <p className="text-destructive/80 text-sm mt-1">
                        {state.error || 'Ocorreu um erro. Tente novamente.'}
                      </p>
                      <div className="flex gap-3 mt-4">
                        <Button variant="outline" size="sm" onClick={actions.prevStep}>
                          Voltar
                        </Button>
                        <Button size="sm" onClick={() => window.location.reload()}>
                          Tentar Novamente
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">

            {/* Contrato on-chain */}
            {sorobanContractId && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <Link2 className="w-4 h-4 mr-2" />
                    Contrato On-chain
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">ID do Contrato</label>
                    <p className="font-mono text-xs break-all mt-1 bg-muted p-2 rounded">
                      {sorobanContractId}
                    </p>
                  </div>
                  {sorobanTxHash && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">TX Hash</label>
                      <p className="font-mono text-xs break-all mt-1 text-primary">
                        {sorobanTxHash.slice(0, 20)}...
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Rede</label>
                    <div className="flex items-center mt-1 gap-2">
                      <Badge variant="secondary" className="text-xs">Stellar Testnet</Badge>
                      <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-700">
                        Soroban
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resumo do pedido */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Resumo do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Produto:</span>
                  <span className="font-medium text-right max-w-[120px] truncate">
                    {state.product?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium">
                    {state.selectedPlan
                      ? `${parseFloat(state.selectedPlan.totalAmount).toFixed(2)} XLM`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parcelas:</span>
                  <span className="font-medium">
                    {state.selectedPlan?.installmentsCount}x
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cada parcela:</span>
                  <span className="font-medium">
                    {state.selectedPlan
                      ? `${parseFloat(state.selectedPlan.installmentAmount).toFixed(2)} XLM`
                      : '—'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Badge de segurança */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6 text-center">
                <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-semibold text-primary mb-1">Seguro pela Stellar</h4>
                <p className="text-xs text-muted-foreground">
                  Contrato imutável registrado on-chain. Pagamento via Etherfuse (regulado).
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProcessingPage;