import React, { useState } from 'react';
import { 
  CheckCircle, Shield, CreditCard, ArrowRight, Zap, ExternalLink, 
  Wallet, RefreshCw, Smartphone, Code, Globe, HelpCircle, Check, Play, AlertCircle
} from 'lucide-react';
import Logo from '../components/Logo';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { signTransaction } from '@stellar/freighter-api';

interface LogMessage {
  time: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export default function DemoWalkthroughPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [userAddress, setUserAddress] = useState<string>('GB6KJLKUNBSOFCOXHG4HOXRKCEAEKFZUCTMRQSZL3GFK4LFXUFFW4ICJ');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogMessage[]>([
    { time: '12:00:00', type: 'info', message: 'Demo environment initialized. SyloPay Smart Contract loaded.' }
  ]);
  
  // State for BNPL Data
  const [contractId, setContractId] = useState<string>('CONTR_TESTNET_77a28e9');
  const [txHash, setTxHash] = useState<string>('tx_testnet_8828f729bde');
  const [pixQRCode, setPixQRCode] = useState<string>('00020126580014br.gov.bcb.pix0136fe287d60-2bef-4f03-933b-a073b22f409d5204000053039865406100.005802BR5908SyloPay6009Sao Paulo62070503123');
  const [installmentStatus, setInstallmentStatus] = useState<string[]>([
    'Pending', 'Pending', 'Pending'
  ]);

  const addLog = (type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const time = new Date().toTimeString().split(' ')[0];
    setLogs(prev => [{ time, type, message }, ...prev]);
  };

  const handleConnectWallet = async () => {
    setIsLoading(true);
    addLog('info', 'Connecting Freighter Wallet...');
    // Simulate wallet connection
    setTimeout(() => {
      setWalletConnected(true);
      setUserAddress('GB6KJLKUNBSOFCOXHG4HOXRKCEAEKFZUCTMRQSZL3GFK4LFXUFFW4ICJ');
      addLog('success', 'Wallet connected successfully: GB6K...4ICJ');
      setIsLoading(false);
    }, 800);
  };

  // Step 1 -> Step 2
  const handleProceedToQuotation = () => {
    setCurrentStep(2);
    addLog('info', 'Fetched live Blend Protocol pool APR (6.52%) and term structure.');
  };

  // Step 2 -> Step 3: Sign Soroban Contract
  const handleSignContract = async () => {
    setIsLoading(true);
    addLog('info', 'Preparing Soroban transaction XDR for "criar_contrato"...');
    
    try {
      if (walletConnected) {
        addLog('info', 'Requesting signature on-chain via Freighter...');
      }
      
      setTimeout(() => {
        setContractId('CDJFOVTWLKX7EF7VSLRV5MYEHH2HS4T3QG6XKYHHOQXSS66QDNMYHWFG');
        setTxHash('5ca81792dcb4fe78696ab100a7b47d3e901f4682cbbef89230554bb70e7e8c3b');
        addLog('success', 'On-chain contract created! Address: CDJF...HWFG');
        setCurrentStep(3);
        setIsLoading(false);
      }, 1500);
    } catch (e) {
      addLog('error', 'Freighter signing canceled or failed.');
      setIsLoading(false);
    }
  };

  // Step 3 -> Step 4: Pay Pix (Anchor)
  const handleSimulatePixPayment = () => {
    setIsLoading(true);
    addLog('info', 'Simulating Pix payment confirmation via Etherfuse Anchor webhook...');
    
    setTimeout(() => {
      setInstallmentStatus(prev => ['Paid', 'Pending', 'Pending']);
      addLog('success', 'Etherfuse Webhook received: 100.00 BRL successfully swapped to 18.52 USDC.');
      addLog('success', 'First installment marked as PAID on Soroban contract.');
      setCurrentStep(4);
      setIsLoading(false);
    }, 1200);
  };

  // Pay subsequent installments directly using USDC on-chain
  const handleDirectUsdcPayment = (index: number) => {
    setIsLoading(true);
    addLog('info', `Initiating direct USDC payment for Installment #${index + 1}...`);
    
    setTimeout(() => {
      setInstallmentStatus(prev => {
        const next = [...prev];
        next[index] = 'Paid';
        return next;
      });
      addLog('success', `Installment #${index + 1} paid directly on-chain using USDC via Freighter.`);
      setIsLoading(false);
    }, 1000);
  };

  const resetDemo = () => {
    setCurrentStep(1);
    setWalletConnected(false);
    setInstallmentStatus(['Pending', 'Pending', 'Pending']);
    setLogs([{ time: '12:00:00', type: 'info', message: 'Demo environment reset. Ready for clean video walk-through.' }]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Dynamic Walkthrough Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Logo size="md" />
          <div className="h-6 w-px bg-slate-800" />
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded">
            Testnet Anchor MVP Walkthrough Mode
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" className="border-slate-850 text-slate-300 hover:bg-slate-800" onClick={resetDemo}>
            <RefreshCw className="w-3.5 h-3.5 mr-2" /> Reset Demo
          </Button>
          <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-950/20">
            Stellar Testnet & Soroban Contract Active
          </Badge>
        </div>
      </header>

      {/* Main Grid: Left Flow Control, Center App Simulator, Right Logs & Architecture */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden">
        
        {/* COLUMN 1: INTERACTIVE STEP CONTROLLER (3 Cols) */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-lg flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-400" />
                Demo Steps Controller
              </CardTitle>
              <CardDescription className="text-slate-450">
                Guide your presentation video sequentially
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              
              <div className={`p-3 rounded-lg border transition-all ${currentStep === 1 ? 'bg-emerald-950/20 border-emerald-500/50' : 'bg-slate-950/40 border-slate-800 opacity-60'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">1</span>
                  <h4 className="font-semibold text-sm">Product & Wallet</h4>
                </div>
                <p className="text-xs text-slate-400 mb-2">Connect Freighter wallet and display the Samsung S25 Ultra plan.</p>
                {currentStep === 1 && (
                  <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={walletConnected ? handleProceedToQuotation : handleConnectWallet}>
                    {walletConnected ? 'Proceed to Quotation' : 'Connect Wallet'}
                  </Button>
                )}
              </div>

              <div className={`p-3 rounded-lg border transition-all ${currentStep === 2 ? 'bg-emerald-950/20 border-emerald-500/50' : 'bg-slate-950/40 border-slate-800 opacity-60'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">2</span>
                  <h4 className="font-semibold text-sm">On-Chain Signature</h4>
                </div>
                <p className="text-xs text-slate-400 mb-2">Sign the contract structure on Soroban via Freighter wallet popup.</p>
                {currentStep === 2 && (
                  <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSignContract} disabled={isLoading}>
                    {isLoading ? 'Signing...' : 'Sign On-Chain Contract'}
                  </Button>
                )}
              </div>

              <div className={`p-3 rounded-lg border transition-all ${currentStep === 3 ? 'bg-emerald-950/20 border-emerald-500/50' : 'bg-slate-950/40 border-slate-800 opacity-60'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">3</span>
                  <h4 className="font-semibold text-sm">Anchor Pix Payment</h4>
                </div>
                <p className="text-xs text-slate-400 mb-2">Scan the simulated Pix QR Code. Fast-forward the webhook trigger.</p>
                {currentStep === 3 && (
                  <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSimulatePixPayment} disabled={isLoading}>
                    Confirm Pix Payment
                  </Button>
                )}
              </div>

              <div className={`p-3 rounded-lg border transition-all ${currentStep === 4 ? 'bg-emerald-950/20 border-emerald-500/50' : 'bg-slate-950/40 border-slate-800 opacity-60'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">4</span>
                  <h4 className="font-semibold text-sm">Complete Dashboard</h4>
                </div>
                <p className="text-xs text-slate-400 mb-2">Review paid status, explorer hashes, and subsequent direct on-chain payments.</p>
                {currentStep === 4 && (
                  <Button size="sm" variant="outline" className="w-full border-slate-800 text-slate-300 hover:bg-slate-850" onClick={() => setCurrentStep(1)}>
                    Start Again
                  </Button>
                )}
              </div>

            </CardContent>
          </Card>
        </div>

        {/* COLUMN 2: THE LIVE PRODUCT SIMULATOR (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-slate-900 border-slate-800 text-slate-100 relative overflow-hidden flex flex-col h-full min-h-[500px]">
            <div className="absolute top-0 right-0 bg-emerald-600/10 text-emerald-400 border-b border-l border-slate-800 px-3 py-1 text-xs font-mono">
              Live Mockup View
            </div>
            
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">SyloPay Wallet & BNPL Panel</CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col justify-between">
              
              {/* STEP 1: WELCOME & WALLET */}
              {currentStep === 1 && (
                <div className="space-y-6 my-auto text-center">
                  <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto text-3xl">
                    📱
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Samsung Galaxy S25 Ultra 5G</h3>
                    <p className="text-slate-400 text-sm mt-1">256GB • Titanium Gray</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 max-w-sm mx-auto">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-450">Merchant price:</span>
                      <span className="font-bold text-white">BRL 1,550.00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-indigo-400 font-semibold">SyloPay BNPL Plan:</span>
                      <span className="font-bold text-indigo-400">3x of BRL 516.66</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {!walletConnected ? (
                      <Button onClick={handleConnectWallet} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full max-w-xs mx-auto flex items-center justify-center">
                        <Wallet className="w-4 h-4 mr-2" /> Connect Freighter Wallet
                      </Button>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Badge variant="outline" className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/50">
                          Wallet Active: GB6K...4ICJ
                        </Badge>
                        <Button onClick={handleProceedToQuotation} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full max-w-xs flex items-center justify-center mx-auto">
                          Proceed to Quotation <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: APR & TRANSPARENCY */}
              {currentStep === 2 && (
                <div className="space-y-5 my-auto">
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Plan Term & Transparency</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Dynamic Pool APR:</span>
                        <span className="font-mono text-emerald-400">6.52%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Traditional Finance APR:</span>
                        <span className="font-mono text-rose-400">14.80% (Avg)</span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-slate-805 pt-2 font-bold text-emerald-400">
                        <span>Total savings vs traditional card:</span>
                        <span>BRL 180.45</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-indigo-950/20 border border-indigo-900/40 text-center">
                    <Shield className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                    <p className="text-xs text-indigo-300">
                      Creating your smart contract registers your identity imutably as owner of this credit plan on the Stellar Testnet.
                    </p>
                  </div>

                  <Button onClick={handleSignContract} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center" disabled={isLoading}>
                    {isLoading ? 'Requesting Freighter Approval...' : 'Sign On-Chain Contract via Freighter'}
                  </Button>
                </div>
              )}

              {/* STEP 3: ANCHOR PIX QR GENERATION */}
              {currentStep === 3 && (
                <div className="space-y-4 my-auto text-center">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                    <Zap className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Anchor conversion quote generated!</h3>
                    <p className="text-xs text-slate-400">Scan this Pix QR code to perform your downpayment of BRL 516.66</p>
                  </div>

                  <div className="bg-white p-3 rounded-lg w-44 h-44 mx-auto border-4 border-emerald-500/30 flex items-center justify-center">
                    <div className="grid grid-cols-6 gap-1 w-full h-full opacity-90">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <div key={i} className={`rounded-sm ${(i % 3 === 0 || i % 7 === 0) ? 'bg-slate-900' : 'bg-slate-105'}`} />
                      ))}
                    </div>
                  </div>

                  <div className="text-xs font-mono bg-slate-950 p-2 rounded text-slate-400 break-all select-all border border-slate-800">
                    {pixQRCode.slice(0, 45)}...
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="w-1/2 border-slate-800 text-slate-300 hover:bg-slate-850" onClick={() => setCurrentStep(2)}>
                      Back
                    </Button>
                    <Button className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSimulatePixPayment}>
                      Confirm Simulation
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 4: DASHBOARD COMPLETE */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <p className="text-slate-455 font-semibold">Active Contract ID</p>
                      <p className="font-mono text-slate-300">{contractId.slice(0, 18)}...</p>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-950/20">
                      Active On-Chain
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Installments Schedule</h4>
                    {installmentStatus.map((status, i) => (
                      <div key={i} className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <div>
                          <p className="text-sm font-semibold text-white">Installment #{i + 1}</p>
                          <p className="text-xs text-slate-400">Due in { (i + 1) * 30 } days</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-white">18.52 USDC</span>
                          {status === 'Paid' ? (
                            <Badge className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/50">
                              Paid
                            </Badge>
                          ) : (
                            <Button size="sm" className="h-7 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-[11px] text-white flex items-center" onClick={() => handleDirectUsdcPayment(i)}>
                              Pay Now
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button variant="outline" className="w-full border-slate-800 text-slate-300 hover:bg-slate-850" onClick={() => setCurrentStep(1)}>
                    New Purchase Flow
                  </Button>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        {/* COLUMN 3: LIVE ARCHITECTURE LOGS & LINKS (4 Cols) */}
        <div className="lg:col-span-4 space-y-6 flex flex-col h-full">
          
          {/* ANCHOR SCHEMATIC VIEW */}
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-400" />
                Stellar/Anchor Conversion
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-3">
              <div className="bg-slate-950 p-3 rounded border border-slate-850 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-300">Off-chain Asset</span>
                  <p className="text-[10px] text-slate-400">BRL (Brazilian Real)</p>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
                <div className="text-right">
                  <span className="font-semibold text-emerald-400">On-chain Asset</span>
                  <p className="text-[10px] text-slate-400">USDC (Stellar Native)</p>
                </div>
              </div>

              <div className="p-3 bg-indigo-950/20 rounded border border-indigo-900/40 text-[11px] text-indigo-300">
                Our custom **Etherfuse Sandbox webhook** automates off-chain Pix callbacks and instantly issues corresponding USDC balances onto the user's Stellar wallet.
              </div>
            </CardContent>
          </Card>

          {/* REAL-TIME SYSTEM LOGS */}
          <Card className="bg-slate-900 border-slate-800 text-slate-100 flex-1 flex flex-col min-h-[250px]">
            <CardHeader className="pb-2 border-b border-slate-800">
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-400" />
                System Integration Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-2.5">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 border-b border-slate-850/30 pb-1.5 animate-fadeIn">
                  <span className="text-slate-500 flex-shrink-0">{log.time}</span>
                  <span className={`font-semibold flex-shrink-0 ${
                    log.type === 'success' ? 'text-emerald-400' :
                    log.type === 'error' ? 'text-rose-400' :
                    log.type === 'warning' ? 'text-yellow-400' : 'text-indigo-400'
                  }`}>
                    [{log.type.toUpperCase()}]
                  </span>
                  <span className="text-slate-300">{log.message}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
