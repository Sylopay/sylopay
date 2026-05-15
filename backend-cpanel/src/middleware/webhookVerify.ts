/**
 * webhookVerify.ts
 * Middleware de verificação de assinatura HMAC dos webhooks Etherfuse
 * Docs: https://docs.etherfuse.com/guides/verifying-webhooks
 */

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function verifyEtherfuseWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const secret = process.env.ETHERFUSE_WEBHOOK_SECRET;

  // Se não há secret configurada (sandbox inicial), deixa passar com aviso
  if (!secret) {
    console.warn('[Webhook] ETHERFUSE_WEBHOOK_SECRET não configurada — ignorando verificação (apenas sandbox)');
    next();
    return;
  }

  const signature = req.headers['x-etherfuse-signature'] as string;
  if (!signature) {
    res.status(401).json({ error: 'Assinatura do webhook ausente' });
    return;
  }

  const body = JSON.stringify(req.body);
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    console.error('[Webhook] Assinatura inválida:', { received: signature, expected });
    res.status(401).json({ error: 'Assinatura do webhook inválida' });
    return;
  }

  next();
}
