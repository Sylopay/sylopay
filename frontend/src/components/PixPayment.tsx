import React, { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, CheckCircle, Clock, RefreshCw, AlertCircle, Zap, ExternalLink, ArrowRightLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';

export type PixStatus = 'waiting' | 'detected' | 'confirmed' | 'expired' | 'error';

export interface PixPaymentProps {
  pixKey: string;
  amountBRL: number;
  expiresAt: string;
  orderId: string;
  onConfirmed: (txHash?: string) => void;
  onExpired?: () => void;
}

export function PixPayment({
  pixKey,
  amountBRL,
  expiresAt,
  orderId,
  onConfirmed,
  onExpired,
}: PixPaymentProps) {
  const [status, setStatus]         = useState<PixStatus>('waiting');
  const [copied, setCopied]         = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [pollCount, setPollCount]   = useState(0);
  const [txHash, setTxHash]         = useState<string | undefined>();

  // Mock exchange rate for demo purposes
  const exchangeRate = 5.20; 
  const usdcAmount = amountBRL / exchangeRate;

  useEffect(() => {
    const expiry = new Date(expiresAt).getTime();

    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && status === 'waiting') {
        setStatus('expired');
        onExpired?.();
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, status, onExpired]);

  const pollOrderStatus = useCallback(async () => {
    if (status === 'confirmed' || status === 'expired' || status === 'error') return;

    try {
      const res = await fetch(`/api/etherfuse/order/${orderId}`);
      const json = await res.json();
      const order = json.order;

      if (!order) return;

      if (order.status === 'completed') {
        setStatus('confirmed');
        setTxHash(order.txHash);
        onConfirmed(order.txHash);
      } else if (order.status === 'failed' || order.status === 'cancelled') {
        setStatus('error');
      } else if (order.status === 'pending') {
        setStatus('detected');
      }

      setPollCount(c => c + 1);
    } catch (err) {
      console.warn('[PixPayment] Polling error:', err);
    }
  }, [orderId, status, onConfirmed]);

  useEffect(() => {
    if (status === 'confirmed' || status === 'expired') return;
    const initial = setTimeout(pollOrderStatus, 5000);
    const interval = setInterval(pollOrderStatus, 3000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [pollOrderStatus, status]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement('textarea');
      el.value = pixKey;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const expiryTotal = Math.max(1, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000) + secondsLeft);
  const expiryProgress = Math.min(100, (secondsLeft / (expiryTotal || 1)) * 100);

  if (status === 'confirmed') {
    return (
      <Card className="border-green-900/40 bg-green-500/10">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-400">Payment Confirmed!</h3>
              <p className="text-green-500/80 text-sm mt-1">
                Your installment has been registered on the Stellar blockchain.
              </p>
            </div>
            {txHash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 underline underline-offset-2 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View transaction on Stellar Explorer
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'expired') {
    return (
      <Card className="border-red-900/40 bg-[#1a0a0a]">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center gap-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <div>
              <h3 className="text-lg font-bold text-red-400">Pix Key Expired</h3>
              <p className="text-red-400/80 text-sm mt-1">
                Payment time has expired. Click "Try Again" to generate a new key.
              </p>
            </div>
            <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`transition-all bg-[#121212] ${
      status === 'detected' ? 'border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'border-zinc-800/80'
    }`}>
      <CardHeader className="pb-3 border-b border-zinc-800/60 mb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
            <Zap className="w-4 h-4 text-orange-500" />
            Pay via Pix
          </CardTitle>
          {status === 'detected' ? (
            <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/30 animate-pulse">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Detected — awaiting settlement
            </Badge>
          ) : (
            <Badge variant="outline" className="font-mono text-xs border-zinc-700 text-zinc-400">
              <Clock className="w-3 h-3 mr-1 text-orange-500" />
              {formatTime(secondsLeft)}
            </Badge>
          )}
        </div>
        <CardDescription className="text-zinc-500">
          Scan the QR Code or copy the key. Payment is confirmed automatically.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className={`p-4 bg-white rounded-xl shadow-lg transition-opacity ${
            secondsLeft === 0 ? 'opacity-30' : 'opacity-100'
          }`}>
            <QRCodeSVG value={pixKey} size={180} level="M" includeMargin={false} />
          </div>

          <div className="text-center space-y-1">
            <span className="text-3xl font-bold text-zinc-100 block">
              BRL {amountBRL.toFixed(2)}
            </span>
            <div className="flex items-center justify-center text-xs font-medium text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
              <span>{usdcAmount.toFixed(2)} USDC</span>
              <ArrowRightLeft className="w-3 h-3 mx-2 opacity-50" />
              <span>Rate: 1 USDC = {exchangeRate.toFixed(2)} BRL</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pix Key</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#0a0a0a] border border-zinc-800 rounded-lg px-3 py-2.5 font-mono text-xs break-all text-zinc-300 select-all">
              {pixKey}
            </div>
            <Button
              size="sm"
              variant={copied ? 'default' : 'outline'}
              onClick={handleCopy}
              className={`flex-shrink-0 h-[38px] transition-all border-zinc-700 ${
                copied ? 'bg-green-600 hover:bg-green-700 text-white border-none' : 'hover:bg-zinc-800 text-zinc-300'
              }`}
            >
              {copied ? (
                <><CheckCircle className="w-4 h-4 mr-1" /> Copied!</>
              ) : (
                <><Copy className="w-4 h-4 mr-1" /> Copy</>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">
            <span>Time remaining</span>
            <span className={secondsLeft < 60 ? 'text-red-400' : 'text-orange-500'}>
              {formatTime(secondsLeft)}
            </span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${secondsLeft < 60 ? 'bg-red-500' : 'bg-orange-500'}`} 
              style={{ width: `${expiryProgress}%` }} 
            />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 bg-[#0a0a0a] py-2 rounded-lg border border-zinc-800/50">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-500/70" />
          <span>
            {status === 'detected'
              ? 'Payment detected — verifying on-chain...'
              : `Checking automatically... (${pollCount} checks)`
            }
          </span>
        </div>

        {/* Investor Demo Controller */}
        <div className="pt-2 border-t border-zinc-800/40 flex justify-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setStatus('confirmed');
              onConfirmed(`sim_tx_investor_${Date.now()}`);
            }}
            className="border-dashed border-zinc-800 text-zinc-500 hover:text-orange-400 hover:border-orange-500/40 hover:bg-orange-500/5 text-[10px] h-7 px-3 flex items-center gap-1.5"
          >
            <Zap className="w-3 h-3 text-orange-500" />
            Investor Sandbox: Instantly Confirm Payment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default PixPayment;