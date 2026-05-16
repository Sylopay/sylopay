import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { DEMO_PRODUCT } from '../types';
import {
  ExternalLink, Calendar, DollarSign, CheckCircle, Clock, RefreshCw,
  Home, TrendingUp, Wallet, Activity, Star, BarChart3, Target, Award, Link2, AlertCircle
} from 'lucide-react';
import { useBNPL } from '../hooks/useBNPL';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import Logo from '../components/Logo';
import PricingCalculator from '../components/PricingCalculator';
import apiService from '../services/api';
import { StellarAccount } from '../types';
import { PricingBreakdown } from '../services/pricingService';
import { useNavigate } from 'react-router-dom';
import { signTransaction } from '@stellar/freighter-api';

interface InstallmentSchedule {
  number: number;
  amount: string;
  dueDate: string;
  status: 'pending' | 'due' | 'paid' | 'overdue';
  paidDate?: string;
  txHash?: string;        // ← on-chain
  explorerUrl?: string;   // ← link Stellar Explorer
}

// Dados reais vindos do contrato Soroban
interface SorobanContrato {
  id: string;
  status: string;
  valorTotal: number;
  numParcelas: number;
  parcelas: Array<{
    numero: number;
    valorUsdc: number;
    vencimento: number;
    status: string;
    txHash: string;
    pagoEm: number;
  }>;
}

export function DashboardPage() {
  const { state, actions } = useBNPL();
  const [accountInfo, setAccountInfo] = useState<StellarAccount | null>(null);
  const [installments, setInstallments] = useState<InstallmentSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricingBreakdown, setPricingBreakdown] = useState<PricingBreakdown | null>(null);
  const [showMerchantAnalytics, setShowMerchantAnalytics] = useState(false);
  const [sorobanContrato, setSorobanContrato] = useState<SorobanContrato | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const handleNewPurchase = () => navigate('/');

  // ── Busca TODOS os contratos do cliente ────────────────────────────────────
  const fetchAllContracts = useCallback(async () => {
    if (!state.customer?.stellarPublicKey) return;
    try {
      const res = await fetch(`/api/soroban/contracts/cliente/${state.customer.stellarPublicKey}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.contracts)) {
        // Se houver contratos, define o primeiro (ou o selecionado) como o atual para exibir detalhes
        if (json.contracts.length > 0) {
          // Atualiza o contrato selecionado ou pega o primeiro
          const currentId = sorobanContrato?.id || state.contract?.id || json.contracts[0].id;
          const updated = json.contracts.find((c: any) => c.id === currentId) || json.contracts[0];
          setSorobanContrato(updated);
        }
      }
    } catch (err) {
      console.warn('[Dashboard] Erro ao buscar lista de contratos:', err);
    }
  }, [state.customer?.stellarPublicKey, sorobanContrato, state.contract?.id]);

  // ── Carregamento inicial e Polling ──────────────────────────────────────────
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!state.customer?.stellarPublicKey) return;

      try {
        setLoading(true);
        // Conta Stellar Real - Wrap in try/catch to not block contracts if account doesn't exist yet
        try {
          const account = await apiService.getStellarAccount(state.customer.stellarPublicKey);
          setAccountInfo(account);
        } catch (accountError) {
          console.warn('[Dashboard] Stellar account not found or not funded yet:', accountError);
          // Set a minimal account info state so the UI doesn't crash
          setAccountInfo({
            publicKey: state.customer.stellarPublicKey,
            balance: '0',
            exists: false,
            explorerUrl: `https://stellar.expert/explorer/testnet/account/${state.customer.stellarPublicKey}`
          } as any);
        }

        await fetchAllContracts();
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Polling a cada 3 segundos para detectar pagamentos via webhook/pix
    const interval = setInterval(() => {
      fetchAllContracts();
    }, 3000);

    return () => clearInterval(interval);
  }, [state.customer?.stellarPublicKey, fetchAllContracts]);

  // ── Refresh manual ──────────────────────────────────────────────────────────
  const handlePayWithWallet = async (numeroParcela: number) => {
    if (!state.customer?.stellarPublicKey) {
      alert('Please connect your wallet first.');
      return;
    }

    if (!sorobanContrato) {
      alert('On-chain contract not yet found. Please wait a few seconds for synchronization or refresh the page.');
      return;
    }

    try {
      setRefreshing(true);
      console.log(`[Dashboard] Preparing on-chain payment for installment #${numeroParcela}...`);
      
      // 1. Prepara XDR
      const res = await fetch('/api/soroban/prepare-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId: sorobanContrato.id,
          numeroParcela,
          clientePublicKey: state.customer.stellarPublicKey,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error preparing payment');
      }
      
      const { xdr } = await res.json();

      // 2. Signed via Freighter
      console.log('[Dashboard] Requesting signature via Freighter...');
      const signedXdr = await signTransaction(xdr, { 
        networkPassphrase: 'Test SDF Network ; September 2015' 
      });

      // 3. Submit signed transaction
      console.log('[Dashboard] Submitting signed transaction to network...');
      const subRes = await fetch('/api/soroban/submit-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedXdr }),
      });

      const subResult = await subRes.json();

      if (subRes.ok && subResult.success) {
        alert('✅ On-chain payment successful! The status will update shortly.');
        await handleRefresh();
      } else {
        throw new Error(subResult.error || 'Transaction failed on network');
      }
    } catch (err) {
      console.error('[Dashboard] Error during wallet payment:', err);
      alert('❌ Payment failed: ' + (err instanceof Error ? err.message : 'Check your wallet connection'));
    } finally {
      setRefreshing(false);
    }
  };

  const handleFundAccount = async () => {
    try {
      setRefreshing(true);
      // We'll use the same public key but ask the backend to fund it via Friendbot
      const res = await fetch('/api/stellar/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: state.customer?.stellarPublicKey })
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Account funded successfully! Please wait a few seconds for the network to update.');
        await handleRefresh();
      } else {
        throw new Error(data.error || 'Failed to fund account');
      }
    } catch (err) {
      console.error('[Dashboard] Error funding account:', err);
      alert('❌ Failed to fund account. Please try again or use a Stellar Faucet.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllContracts();
    if (state.customer?.stellarPublicKey) {
      const account = await apiService.getStellarAccount(state.customer.stellarPublicKey);
      setAccountInfo(account);
    }
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatAmount = (amount: string) => {
    return `${parseFloat(amount).toFixed(2)} USDC`;
  };

  const getStatusIcon = (status: InstallmentSchedule['status']) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-success-600" />;
      case 'due':
        return <Clock className="w-5 h-5 text-warning-600" />;
      case 'overdue':
        return <Clock className="w-5 h-5 text-error-600" />;
      default:
        return <Calendar className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: InstallmentSchedule['status']) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'due':
        return 'Due';
      case 'overdue':
        return 'Overdue';
      default:
        return 'Pending';
    }
  };

  const getStatusColor = (status: InstallmentSchedule['status']) => {
    switch (status) {
      case 'paid':
        return 'text-success-600 bg-success-100';
      case 'due':
        return 'text-warning-600 bg-warning-100';
      case 'overdue':
        return 'text-error-600 bg-error-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const paidInstallments = sorobanContrato
    ? sorobanContrato.parcelas.filter(p => p.status === 'Paid').length
    : (installments?.filter(i => i.status === 'paid').length || 0);

  const totalInstallments = sorobanContrato
    ? sorobanContrato.parcelas.length
    : (installments?.length || 0);

  const progress = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0;

  const displayInstallments = useMemo(() => {
    if (sorobanContrato) {
      return sorobanContrato.parcelas.map(p => ({
        number: p.numero,
        amount: (p.valorUsdc / 10000000).toFixed(2), // USDC scale adjustment
        dueDate: p.vencimento ? new Date(p.vencimento * 1000).toISOString() : new Date().toISOString(),
        status: p.status === 'Paid' ? 'paid' : 'due',
        txHash: p.txHash,
        explorerUrl: p.txHash ? `https://stellar.expert/explorer/testnet/tx/${p.txHash}` : undefined
      }));
    }

    // Fallback to mock installments based on selected plan if not yet on-chain
    if (state.selectedPlan) {
      return Array.from({ length: state.selectedPlan.installmentsCount }, (_, i) => ({
        number: i + 1,
        amount: parseFloat(state.selectedPlan!.installmentAmount).toFixed(2),
        dueDate: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'due' as const,
        txHash: undefined,
        explorerUrl: undefined
      }));
    }

    return installments;
  }, [sorobanContrato, state.selectedPlan, installments]);

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Header */}
      <header className="border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Logo size="md" />
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="hidden sm:flex">
                <Activity className="w-3 h-3 mr-1" />
                Active Contract
              </Badge>
              <Button
                variant={showMerchantAnalytics ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMerchantAnalytics(!showMerchantAnalytics)}
                className="flex items-center"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {showMerchantAnalytics ? "Customer View" : "Merchant Analytics"}
              </Button>
              {state.contract?.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  title="Atualizar dados on-chain"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewPurchase}
                className="flex items-center"
              >
                <Home className="w-4 h-4 mr-2" />
                New Purchase
              </Button>
            </div>

          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Step 5 of 5</span>
            <span>100% Complete</span>
          </div>
          <Progress value={100} className="h-2" />
        </div>

        {/* Success Banner */}
        <Card className="mb-8 border-green-500/20 bg-gradient-to-r from-green-500/5 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  🎉 Congratulations! Your BNPL Contract is Live!
                </h3>
                <p className="text-muted-foreground mb-4">
                  Your contract has been successfully created on the Stellar blockchain. Track your installments and monitor all transactions with full transparency.
                </p>
                {state.contract && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="border-green-500/30 text-green-600 hover:bg-green-500/10"
                  >
                    <a
                      href={state.contract.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on Stellar Explorer
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Merchant Analytics Section */}
        {showMerchantAnalytics && (
          <Card className="mb-8 border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Merchant Revenue Analytics</CardTitle>
                    <CardDescription>
                      Real-time pricing intelligence powered by Blend Protocol
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                  <Award className="w-3 h-3 mr-1" />
                  Premium Insights
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-background rounded-lg border">
                  <div className="text-2xl font-bold text-green-600">
                    {pricingBreakdown ? `$${(pricingBreakdown.savings.vsTradionalBNPL * 2.5).toFixed(0)}` : '$180'}
                  </div>
                  <div className="text-sm text-muted-foreground">Saved vs Traditional BNPL</div>
                  <div className="text-xs text-green-600">Per transaction</div>
                </div>
                <div className="text-center p-4 bg-background rounded-lg border">
                  <div className="text-2xl font-bold text-blue-600">3.5%</div>
                  <div className="text-sm text-muted-foreground">Merchant Fee</div>
                  <div className="text-xs text-blue-600">41% below market avg</div>
                </div>
                <div className="text-center p-4 bg-background rounded-lg border">
                  <div className="text-2xl font-bold text-purple-600">Instant</div>
                  <div className="text-sm text-muted-foreground">Settlement</div>
                  <div className="text-xs text-purple-600">vs T+7 traditional</div>
                </div>
              </div>

              {state.selectedPlan && (
                <PricingCalculator
                  amount={parseFloat(state.selectedPlan.totalAmount)}
                  installments={state.selectedPlan.installmentsCount}
                  onPricingUpdate={(pricing) => setPricingBreakdown(pricing)}
                />
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-2xl font-bold text-foreground">
                        {sorobanContrato ? `${(sorobanContrato.valorTotal / 10000000).toFixed(2)} USDC` : '0 USDC'}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Installments</p>
                      <p className="text-2xl font-bold text-foreground">
                        {totalInstallments}x
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Progress</p>
                      <p className="text-2xl font-bold text-foreground">{progress.toFixed(0)}%</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Progress</CardTitle>
                <CardDescription>
                  {paidInstallments} of {totalInstallments} installments completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Progress value={progress} className="h-3" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Started</span>
                    <span>{progress.toFixed(0)}% Complete</span>
                    <span>Finished</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Installment Schedule */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Payment Schedule
                  </CardTitle>
                  {sorobanContrato && (
                    <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-700 border-purple-500/20">
                      <Link2 className="w-3 h-3 mr-1" />
                      On-chain
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {sorobanContrato
                    ? 'Data retrieved directly from Soroban on-chain contract'
                    : 'Track your pending and completed payments'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {displayInstallments.map((installment) => (
                    <div
                      key={installment.number}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(installment.status as any)}
                        <div>
                          <div className="font-medium text-foreground">
                            Installment #{installment.number}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Due Date: {formatDate(installment.dueDate)}
                          </div>
                          {/* Link on-chain quando parcela foi paga */}
                          {installment.txHash && (
                            <a
                              href={installment.explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View on-chain tx
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-semibold text-foreground">
                            {installment.amount} USDC
                          </div>
                          <Badge
                            variant={installment.status === 'paid' ? 'default' :
                              installment.status === 'due' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {getStatusText(installment.status as any)}
                          </Badge>
                        </div>

                        {installment.status === 'due' && (
                          <Button size="sm" onClick={() => handlePayWithWallet(installment.number)}>
                            Pay Now
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Product Purchased Card */}
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white overflow-hidden">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0\">
                    📱
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white truncate">
                      {state.product?.name || DEMO_PRODUCT.name}
                    </p>
                    <p className="text-xs text-slate-400">256GB • Titanium Black</p>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-400">Total value</span>
                  <span className="font-bold text-white">
                    BRL {parseFloat(state.product?.price || DEMO_PRODUCT.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {state.selectedPlan && (
                  <div className="flex items-center justify-between bg-primary/20 rounded-lg px-3 py-2 mt-2">
                    <span className="text-xs text-slate-300">Split into</span>
                    <span className="font-bold text-primary-foreground">
                      {state.selectedPlan.installmentsCount}x of BRL {parseFloat(state.selectedPlan.installmentAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stellar Account Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-base">
                    <Wallet className="w-4 h-4 mr-2" />
                    Stellar Account
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {accountInfo ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Public Key</label>
                      <p className="font-mono text-xs break-all bg-muted p-2 rounded mt-1">
                        {accountInfo.publicKey}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Balances</label>
                      <div className="space-y-2 mt-1">
                        <div className="flex justify-between items-center bg-muted/50 rounded-lg px-3 py-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-yellow-900">★</span>
                            </div>
                            <span className="text-sm font-medium">XLM</span>
                          </div>
                          <span className="text-lg font-bold text-primary">
                            {parseFloat(accountInfo.balance).toFixed(2)}
                          </span>
                        </div>
                        {accountInfo.balances?.filter(b => b.asset_code === 'USDC').map((usdc, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-muted/50 rounded-lg px-3 py-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-xs font-bold text-white">$</span>
                              </div>
                              <span className="text-sm font-medium">USDC</span>
                            </div>
                            <span className="text-lg font-bold text-blue-600">
                              {parseFloat(usdc.balance).toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {!accountInfo.balances?.find(b => b.asset_code === 'USDC') && (
                          <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-center bg-muted/50 rounded-lg px-3 py-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-bold text-white">$</span>
                                </div>
                                <span className="text-sm font-medium">USDC</span>
                              </div>
                              <span className="text-sm text-muted-foreground">No trustline</span>
                            </div>
                            
                            {!accountInfo.exists && (
                              <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-warning-700 text-xs font-semibold mb-2">
                                  <AlertCircle className="w-4 h-4" />
                                  Account not active
                                </div>
                                <p className="text-[10px] text-warning-600 mb-3">
                                  Your account needs to be funded with XLM to perform on-chain payments.
                                </p>
                                <Button 
                                  size="sm" 
                                  className="w-full h-8 text-xs bg-warning-600 hover:bg-warning-700"
                                  onClick={handleFundAccount}
                                  disabled={refreshing}
                                >
                                  {refreshing ? 'Funding...' : 'Fund with Friendbot'}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      asChild
                    >
                      <a
                        href={accountInfo.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View on Explorer
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading account info...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contract Details */}
            {state.contract && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contract Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Contract ID</label>
                    <p className="font-mono text-xs break-all">{state.contract.id}</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Transaction Hash</label>
                    <p className="font-mono text-xs break-all">{state.contract.stellarTxHash}</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Status</label>
                    <div className="flex items-center mt-1">
                      <Badge variant="default" className="bg-green-500 text-green-50">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {state.contract.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;