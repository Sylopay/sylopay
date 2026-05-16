/**
 * PixPayment.tsx
 * Componente de pagamento Pix com QR Code, countdown e polling de status.
 * Conectado à Etherfuse sandbox via /api/etherfuse/order/:orderId
 */

import React, { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy, CheckCircle, Clock, RefreshCw, AlertCircle, Zap, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type PixStatus = 'waiting' | 'detected' | 'confirmed' | 'expired' | 'error';

export interface PixPaymentProps {
  /** Chave Pix (dinâmica ou estática) retornada pela Etherfuse */
  pixKey: string;
  /** Valor em BRL */
  amountBRL: number;
  /** ISO string de expiração da chave */
  expiresAt: string;
  /** ID da ordem Etherfuse — usado no polling */
  orderId: string;
  /** Chamado quando o pagamento é confirmado */
  onConfirmed: (txHash?: string) => void;
  /** Chamado quando a chave expira */
  onExpired?: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

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

  // ─── Countdown ─────────────────────────────────────────────────────────────

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

  // ─── Polling de status ──────────────────────────────────────────────────────

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
        // Pagamento detectado mas ainda não liquidado
        setStatus('detected');
      }

      setPollCount(c => c + 1);
    } catch (err) {
      console.warn('[PixPayment] Polling error:', err);
    }
  }, [orderId, status, onConfirmed]);

  useEffect(() => {
    if (status === 'confirmed' || status === 'expired') return;

    // Primeira checagem imediata após 5s, depois a cada 3s
    const initial = setTimeout(pollOrderStatus, 5000);
    const interval = setInterval(pollOrderStatus, 3000);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [pollOrderStatus, status]);

  // ─── Copiar chave Pix ───────────────────────────────────────────────────────

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback para navegadores antigos
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

  // ─── Formatação ─────────────────────────────────────────────────────────────

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const expiryTotal = Math.max(
    1,
    Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000) + secondsLeft
  );
  const expiryProgress = Math.min(100, (secondsLeft / (expiryTotal || 1)) * 100);

  // ─── Estados visuais ────────────────────────────────────────────────────────

  if (status === 'confirmed') {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-700">Pagamento Confirmado!</h3>
              <p className="text-green-600/80 text-sm mt-1">
                Sua parcela foi registrada na blockchain Stellar.
              </p>
            </div>
            {txHash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-green-600 underline underline-offset-2"
              >
                <ExternalLink className="w-3 h-3" />
                Ver transação no Stellar Explorer
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'expired') {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center gap-4">
            <AlertCircle className="w-12 h-12 text-destructive" />
            <div>
              <h3 className="text-lg font-bold text-destructive">Chave Pix Expirada</h3>
              <p className="text-destructive/80 text-sm mt-1">
                O tempo para pagamento acabou. Clique em "Tentar Novamente" para gerar uma nova chave.
              </p>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Estado principal: aguardando pagamento ─────────────────────────────────

  return (
    <Card className={`transition-all ${
      status === 'detected'
        ? 'border-yellow-500/40 bg-yellow-500/5'
        : 'border-primary/20'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-primary" />
            Pague via Pix
          </CardTitle>
          {status === 'detected' ? (
            <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30 animate-pulse">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Detectado — aguardando liquidação
            </Badge>
          ) : (
            <Badge variant="secondary" className="font-mono text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {formatTime(secondsLeft)}
            </Badge>
          )}
        </div>
        <CardDescription>
          Escaneie o QR Code ou copie a chave. O pagamento é confirmado automaticamente.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* QR Code */}
        <div className="flex flex-col items-center gap-3">
          <div className={`p-4 bg-white rounded-2xl shadow-sm transition-opacity ${
            secondsLeft === 0 ? 'opacity-30' : 'opacity-100'
          }`}>
            <QRCodeSVG
              value={pixKey}
              size={180}
              level="M"
              includeMargin={false}
              className="rounded-lg"
            />
          </div>

          {/* Valor */}
          <div className="text-center">
            <span className="text-3xl font-bold text-foreground">
              R$ {amountBRL.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        {/* Chave Pix copiável */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Chave Pix</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-lg px-3 py-2 font-mono text-xs break-all text-foreground select-all">
              {pixKey}
            </div>
            <Button
              size="sm"
              variant={copied ? 'default' : 'outline'}
              onClick={handleCopy}
              className={`flex-shrink-0 transition-all ${
                copied ? 'bg-green-600 hover:bg-green-700 text-white' : ''
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Copiar
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Countdown bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tempo restante</span>
            <span className={secondsLeft < 60 ? 'text-destructive font-semibold' : ''}>
              {formatTime(secondsLeft)}
            </span>
          </div>
          <Progress
            value={expiryProgress}
            className={`h-1.5 transition-all ${secondsLeft < 60 ? '[&>div]:bg-destructive' : ''}`}
          />
        </div>

        {/* Polling indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>
            {status === 'detected'
              ? 'Pagamento detectado — aguardando confirmação on-chain...'
              : `Verificando automaticamente... (${pollCount} verificações)`
            }
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default PixPayment;
