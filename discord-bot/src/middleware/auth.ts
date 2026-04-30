import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    logger.error('WEBHOOK_SECRET is not configured');
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  const provided = req.headers['x-webhook-secret'];
  if (provided !== secret) {
    logger.warn({ ip: req.ip }, 'Webhook auth failed — invalid secret');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
