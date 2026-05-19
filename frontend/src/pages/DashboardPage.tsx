import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { DEMO_PRODUCT } from '../types';
import {
  ExternalLink, Calendar, DollarSign, CheckCircle, Clock, RefreshCw,
  Home, TrendingUp, Wallet, Activity, BarChart3, Target, Award, Link2, AlertCircle, X, ScrollText, Zap,
  Shield
} from 'lucide-react';
import { useBNPL } from '../hooks/useBNPL';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import Logo from '../components/Logo';
import LoadingSpinner from '../components/LoadingSpinner';
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
  txHash?: string;
  explorerUrl?: string;
}

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

  // Modal States
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [pendingPaymentInstallment, setPendingPaymentInstallment] = useState<number | null>(null);
  const [paymentStatusModal, setPaymentStatusModal] = useState<{ open: boolean; type: 'success' | 'error'; message: string; txHash?: string }>({ open: false, type: 'success', message: '' });

  const sorobanContratoRef = useRef<SorobanContrato | null>(null);
  useEffect(() => {
    sorobanContratoRef.current = sorobanContrato;
  }, [sorobanContrato]);

  const handleNewPurchase = () => navigate('/');

  const fetchAllContracts = useCallback(async () => {
    if (!state.customer?.stellarPublicKey) return;
    try {
      const res = await fetch(`/api/soroban/contracts/cliente/${state.customer.stellarPublicKey}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.contracts) && json.contracts.length > 0) {
        const currentId = sorobanContratoRef.current?.id || state.contract?.id || json.contracts[0].id;
        const updated = json.contracts.find((c: any) => c.id === currentId) || json.contracts[0];
        setSorobanContrato(updated);
      }
    } catch (err) {
      console.warn('[Dashboard] Erro ao buscar lista de contratos:', err);
    }
  }, [state.customer?.stellarPublicKey, state.contract?.id]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!state.customer?.stellarPublicKey) return;
      try {
        setLoading(true);
        try {
          const account = await apiService.getStellarAccount(state.customer.stellarPublicKey);
          setAccountInfo(account);
        } catch (accountError) {
          console.warn('[Dashboard] Stellar account not found or not funded yet:', accountError);
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
    const interval = setInterval(() => fetchAllContracts(), 10000);
    return () => clearInterval(interval);
  }, [state.customer?.stellarPublicKey, fetchAllContracts]);

  // Click handler from the button - opens explanation modal first
  const triggerPaymentProcess = (numeroParcela: number) => {
    setPendingPaymentInstallment(numeroParcela);
    setIsSignModalOpen(true);
  };

  // Actual payment logic after user confirms understanding
  const executeWalletPayment = async () => {
    if (!state.customer?.stellarPublicKey || !sorobanContrato || pendingPaymentInstallment === null) return;
    setIsSignModalOpen(false); // Close explanation modal

    try {
      setRefreshing(true);

      const res = await fetch('/api/soroban/prepare-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId: sorobanContrato.id,
          numeroParcela: pendingPaymentInstallment,
          clientePublicKey: state.customer.stellarPublicKey,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { xdrPayment, xdrSoroban } = await res.json();
      const PASSPHRASE = 'Test SDF Network ; September 2015';

      // 1st Signature
      console.log('[Dashboard] Assinando pagamento USDC...');
      const sig1 = await signTransaction(xdrPayment, { networkPassphrase: PASSPHRASE }) as any;
      const signedPayment = typeof sig1 === 'string' ? sig1 : sig1.signedTxXdr;
      if (!signedPayment) throw new Error('Falha ao assinar TX de pagamento');

      const sub1 = await fetch('/api/stellar/submit-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedXdr: signedPayment }),
      });
      const res1 = await sub1.json();
      if (!sub1.ok || !res1.success) throw new Error('Falha no pagamento USDC: ' + (res1.error || JSON.stringify(res1)));

      // 2nd Signature
      console.log('[Dashboard] Assinando atualização on-chain...');
      const sig2 = await signTransaction(xdrSoroban, { networkPassphrase: PASSPHRASE }) as any;
      const signedSoroban = typeof sig2 === 'string' ? sig2 : sig2.signedTxXdr;
      if (!signedSoroban) throw new Error('Falha ao assinar TX Soroban');

      const sub2 = await fetch('/api/soroban/submit-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedXdr: signedSoroban }),
      });
      const res2 = await sub2.json();
      if (!sub2.ok || !res2.success) throw new Error('Falha ao atualizar contrato: ' + res2.error);

      // Success Modal
      setPaymentStatusModal({
        open: true,
        type: 'success',
        message: 'Payment completed successfully! USDC transferred and on-chain contract updated.',
        txHash: res2.txHash
      });
      
      await handleRefresh();
    } catch (err) {
      console.error('[Dashboard] Erro:', err);
      // Error Modal
      setPaymentStatusModal({
        open: true,
        type: 'error',
        message: 'Payment failed: ' + (err instanceof Error ? err.message : 'Unknown error')
      });
    } finally {
      setRefreshing(false);
      setPendingPaymentInstallment(null);
    }
  };

  const handleFundAccount = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/stellar/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey: state.customer?.stellarPublicKey })
      });
      const data = await res.json();
      if (data.success) {
        setPaymentStatusModal({ open: true, type: 'success', message: 'Account funded successfully! Please wait a few seconds for the network to update.' });
        await handleRefresh();
      } else {
        throw new Error(data.error || 'Failed to fund account');
      }
    } catch (err) {
      setPaymentStatusModal({ open: true, type: 'error', message: 'Failed to fund account. Please try again or use a Stellar Faucet.' });
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
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusIcon = (status: InstallmentSchedule['status']) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'due': return <Clock className="w-5 h-5 text-orange-500" />;
      case 'overdue': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Calendar className="w-5 h-5 text-zinc-500" />;
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
        amount: (p.valorUsdc / 10000000).toFixed(2),
        dueDate: p.vencimento ? new Date(p.vencimento * 1000).toISOString() : new Date().toISOString(),
        status: p.status === 'Paid' ? 'paid' : 'due',
        txHash: p.txHash,
        explorerUrl: p.txHash ? `https://stellar.expert/explorer/testnet/tx/${p.txHash}` : undefined
      }));
    }

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
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-200 selection:bg-orange-500/30">
      {/* DOUBLE SIGNATURE EXPLANATION MODAL */}
      {isSignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121212] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-500" />
                Wallet Signatures Required
              </h3>
              <button onClick={() => setIsSignModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-zinc-400 leading-relaxed">
                To securely process this installment, your Freighter wallet will prompt you to approve <strong className="text-zinc-200">two separate transactions</strong>. Here is why:
              </p>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-400">1</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-200">Transfer USDC</h4>
                    <p className="text-xs text-zinc-500 mt-1">First signature authorizes the actual payment of USDC from your wallet to the merchant.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-orange-400">2</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-200">Update Smart Contract</h4>
                    <p className="text-xs text-zinc-500 mt-1">Second signature writes the digital receipt into the Soroban smart contract, officially marking the installment as "Paid" on the blockchain.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3 w-full">
                <Button variant="outline" className="flex-1 border-zinc-700 hover:bg-zinc-800 text-zinc-300" onClick={() => setIsSignModalOpen(false)}>Cancel</Button>
                <Button className="flex-1 bg-orange-600 hover:bg-orange-700 text-white border-none" onClick={executeWalletPayment}>I Understand, Proceed</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS / ERROR STATUS MODAL */}
      {paymentStatusModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className={`bg-[#121212] border rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 ${paymentStatusModal.type === 'success' ? 'border-green-900/50' : 'border-red-900/50'}`}>
            <div className="p-6 flex flex-col items-center text-center">
              {paymentStatusModal.type === 'success' ? (
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
              )}
              
              <h3 className={`text-lg font-bold mb-2 ${paymentStatusModal.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {paymentStatusModal.type === 'success' ? 'Success!' : 'Transaction Failed'}
              </h3>
              
              <p className="text-sm text-zinc-400 mb-6">
                {paymentStatusModal.message}
              </p>

              {paymentStatusModal.type === 'success' && paymentStatusModal.txHash && (
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${paymentStatusModal.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-orange-400 hover:underline mb-6 bg-orange-500/10 px-3 py-1.5 rounded"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View transaction receipt
                </a>
              )}

              <Button 
                className={`w-full text-white border-none ${paymentStatusModal.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                onClick={() => setPaymentStatusModal({ ...paymentStatusModal, open: false })}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Header */}
      <header className="border-b border-zinc-800/60 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Logo size="md" className="text-orange-500" />
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="hidden sm:flex border-zinc-700 bg-zinc-900 text-zinc-400">
                <Activity className="w-3 h-3 mr-1 text-green-500" />
                Active Contract
              </Badge>
              <Button
                variant={showMerchantAnalytics ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMerchantAnalytics(!showMerchantAnalytics)}
                className={`flex items-center border-zinc-700 transition-colors ${showMerchantAnalytics ? 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700' : 'bg-transparent text-zinc-300 hover:bg-zinc-800'}`}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {showMerchantAnalytics ? "Customer View" : "Merchant Analytics"}
              </Button>
              {state.contract?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  title="Refresh on-chain data"
                  className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 px-2"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-orange-500' : ''}`} />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewPurchase}
                className="flex items-center border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800"
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
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mb-2">
            <span>Step 5 of 5</span>
            <span className="text-orange-500">100% Complete</span>
          </div>
          <div className="h-1 bg-zinc-800/80 rounded-full overflow-hidden">
             <div className="h-full bg-orange-600 rounded-full w-full" />
          </div>
        </div>

        {/* Success Banner */}
        <Card className="mb-8 border-green-900/40 bg-gradient-to-r from-green-500/10 to-[#121212]">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 border border-green-500/30">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-green-400 mb-2">
                  🎉 Congratulations! Your BNPL Contract is Live!
                </h3>
                <p className="text-zinc-400 text-sm mb-4">
                  Your contract has been successfully created on the Stellar blockchain. Track your installments and monitor all transactions with full transparency.
                </p>
                {state.contract && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300 bg-transparent"
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
          <Card className="mb-8 border-indigo-900/40 bg-gradient-to-r from-indigo-950/30 to-[#121212] animate-in fade-in slide-in-from-top-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center border border-indigo-500/30">
                    <Target className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-indigo-100">Merchant Revenue Analytics</CardTitle>
                    <CardDescription className="text-indigo-400/70">
                      Real-time pricing intelligence powered by Blend Protocol
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hidden sm:flex">
                  <Award className="w-3 h-3 mr-1" />
                  Premium Insights
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-[#0a0a0a] rounded-xl border border-zinc-800">
                  <div className="text-2xl font-bold text-green-500">
                    {pricingBreakdown ? `$${(pricingBreakdown.savings.vsTradionalBNPL * 2.5).toFixed(0)}` : '$180'}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mt-1">Saved vs Traditional</div>
                  <div className="text-[10px] text-green-500/80 mt-1">Per transaction</div>
                </div>
                <div className="text-center p-4 bg-[#0a0a0a] rounded-xl border border-zinc-800">
                  <div className="text-2xl font-bold text-indigo-400">3.5%</div>
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mt-1">Merchant Fee</div>
                  <div className="text-[10px] text-indigo-400/80 mt-1">41% below market avg</div>
                </div>
                <div className="text-center p-4 bg-[#0a0a0a] rounded-xl border border-zinc-800">
                  <div className="text-2xl font-bold text-purple-400">Instant</div>
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mt-1">Settlement</div>
                  <div className="text-[10px] text-purple-400/80 mt-1">vs T+7 traditional</div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-[#121212] border-zinc-800/80">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Total Amount</p>
                      <p className="text-2xl font-bold text-zinc-100 mt-1">
                        {sorobanContrato ? `${(sorobanContrato.valorTotal / 10000000).toFixed(2)}` : '0.00'} <span className="text-sm font-normal text-zinc-500">USDC</span>
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center border border-orange-500/20">
                      <DollarSign className="w-5 h-5 text-orange-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#121212] border-zinc-800/80">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Installments</p>
                      <p className="text-2xl font-bold text-zinc-100 mt-1">
                        {totalInstallments}x
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center border border-orange-500/20">
                      <Calendar className="w-5 h-5 text-orange-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#121212] border-zinc-800/80">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Progress</p>
                      <p className="text-2xl font-bold text-green-500 mt-1">{progress.toFixed(0)}%</p>
                    </div>
                    <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Progress */}
            <Card className="bg-[#121212] border-zinc-800/80">
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-zinc-100">Payment Progress</CardTitle>
                <CardDescription className="text-zinc-400">
                  {paidInstallments} of {totalInstallments} installments completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                    <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500 uppercase tracking-wider font-semibold pt-1">
                    <span>Started</span>
                    <span className="text-green-500/80">{progress.toFixed(0)}% Complete</span>
                    <span>Finished</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Installment Schedule */}
            <Card className="bg-[#121212] border-zinc-800/80">
              <CardHeader className="border-b border-zinc-800/50 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-base text-zinc-100">
                    <ScrollText className="w-4 h-4 mr-2 text-orange-500" />
                    Payment Schedule
                  </CardTitle>
                  {sorobanContrato && (
                    <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/30">
                      <Link2 className="w-3 h-3 mr-1" />
                      On-chain Sync
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {displayInstallments.map((installment) => (
                    <div
                      key={installment.number}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl transition-all ${
                        installment.status === 'paid' ? 'bg-green-500/5 border-green-900/30' :
                        installment.status === 'due' ? 'bg-[#1a1510] border-orange-500/30' :
                        'bg-[#0a0a0a] border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                          installment.status === 'paid' ? 'bg-green-500/10 border-green-500/30' :
                          installment.status === 'due' ? 'bg-orange-500/10 border-orange-500/30' :
                          'bg-zinc-900 border-zinc-800'
                        }`}>
                          {getStatusIcon(installment.status as any)}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-zinc-200">
                            Installment #{installment.number}
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            Due: {formatDate(installment.dueDate)}
                          </div>
                          {installment.txHash && (
                            <a
                              href={installment.explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-green-500/80 hover:text-green-400 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View receipt
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end sm:space-x-6 w-full sm:w-auto border-t border-zinc-800/50 sm:border-0 pt-3 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <div className="font-bold text-zinc-100">
                            {installment.amount} USDC
                          </div>
                          <div className="mt-1">
                            <Badge
                              variant="outline"
                              className={`text-[10px] border-none uppercase tracking-wider font-bold ${
                                installment.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                installment.status === 'due' ? 'bg-orange-500/20 text-orange-400' : 
                                'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {installment.status}
                            </Badge>
                          </div>
                        </div>

                        {installment.status === 'due' && (
                          <Button 
                            size="sm" 
                            className="bg-orange-600 hover:bg-orange-700 text-white border-none shadow-[0_0_10px_rgba(234,88,12,0.2)]"
                            onClick={() => triggerPaymentProcess(installment.number)}
                            disabled={refreshing}
                          >
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
            <Card className="bg-[#121212] border-zinc-800/80 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                 <Zap className="w-24 h-24 text-orange-500" />
              </div>
              <CardContent className="pt-6 pb-5 relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    📱
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-zinc-100 truncate">
                      {state.product?.name || DEMO_PRODUCT.name}
                    </p>
                    <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mt-1">256GB • Titanium Black</p>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-[#0a0a0a] border border-zinc-800 rounded-lg px-3 py-2.5">
                  <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Total value</span>
                  <span className="font-bold text-zinc-200">
                    BRL {parseFloat(state.product?.price || DEMO_PRODUCT.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {state.selectedPlan && (
                  <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2.5 mt-2">
                    <span className="text-[11px] text-orange-500/80 uppercase tracking-wider font-semibold">Split into</span>
                    <span className="font-bold text-orange-500">
                      {state.selectedPlan.installmentsCount}x of BRL {parseFloat(state.selectedPlan.installmentAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stellar Account Info */}
            <Card className="bg-[#121212] border-zinc-800/80">
              <CardHeader className="pb-3 border-b border-zinc-800/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-sm text-zinc-200">
                    <Wallet className="w-4 h-4 mr-2 text-blue-400" />
                    Stellar Wallet
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                {accountInfo ? (
                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Public Key</label>
                      <p className="font-mono text-xs break-all bg-[#0a0a0a] border border-zinc-800 text-zinc-400 p-2 rounded-lg mt-1.5 select-all">
                        {accountInfo.publicKey}
                      </p>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Balances</label>
                      <div className="space-y-2 mt-2">
                        <div className="flex justify-between items-center bg-[#0a0a0a] border border-zinc-800 rounded-lg px-3 py-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center border border-yellow-500/30">
                              <span className="text-[10px] font-bold text-yellow-500">★</span>
                            </div>
                            <span className="text-xs font-semibold text-zinc-300">XLM</span>
                          </div>
                          <span className="text-sm font-bold text-zinc-100">
                            {parseFloat(accountInfo.balance).toFixed(2)}
                          </span>
                        </div>
                        {accountInfo.balances?.filter(b => b.asset_code === 'USDC').map((usdc, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-blue-950/20 border border-blue-900/40 rounded-lg px-3 py-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
                                <span className="text-[10px] font-bold text-blue-400">$</span>
                              </div>
                              <span className="text-xs font-semibold text-zinc-300">USDC</span>
                            </div>
                            <span className="text-sm font-bold text-blue-400">
                              {parseFloat(usdc.balance).toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {!accountInfo.balances?.find(b => b.asset_code === 'USDC') && (
                          <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-center bg-[#0a0a0a] border border-zinc-800 rounded-lg px-3 py-2 opacity-50">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center">
                                  <span className="text-[10px] font-bold text-zinc-500">$</span>
                                </div>
                                <span className="text-xs font-semibold text-zinc-500">USDC</span>
                              </div>
                              <span className="text-xs font-medium text-zinc-600">No trustline</span>
                            </div>

                            {!accountInfo.exists && (
                              <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-red-400 text-xs font-semibold mb-2">
                                  <AlertCircle className="w-4 h-4" />
                                  Account not active
                                </div>
                                <p className="text-[10px] text-red-400/80 mb-3 leading-relaxed">
                                  Your account needs to be funded with XLM to perform on-chain payments and establish trustlines.
                                </p>
                                <Button
                                  size="sm"
                                  className="w-full h-8 text-[11px] uppercase tracking-wider font-bold bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-900/50"
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
                      className="w-full border-zinc-800 bg-[#0a0a0a] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 h-9"
                      asChild
                    >
                      <a href={accountInfo.explorerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                        <ExternalLink className="w-3.5 h-3.5 mr-2" />
                        View on Explorer
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <LoadingSpinner size="sm" />
                    <p className="text-xs text-zinc-500 mt-3">Syncing wallet data...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contract Technical Details */}
            {state.contract && (
              <Card className="bg-[#121212] border-zinc-800/80">
                <CardHeader className="pb-3 border-b border-zinc-800/50">
                  <CardTitle className="text-sm text-zinc-200 flex items-center">
                    <ScrollText className="w-4 h-4 mr-2 text-zinc-400" />
                    Soroban Reference
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Contract ID</label>
                    <p className="font-mono text-[11px] break-all text-zinc-400 mt-1">{state.contract.id}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Initialization TX</label>
                    <p className="font-mono text-[11px] break-all text-zinc-400 mt-1">{state.contract.stellarTxHash}</p>
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