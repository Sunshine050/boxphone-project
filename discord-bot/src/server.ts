import 'dotenv/config';
import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';
import logger from './lib/logger';
import { authMiddleware } from './middleware/auth';
import { isDuplicate } from './middleware/dedup';
import { AnyEvent } from './types/events';
import { routeEvent } from './handlers/router';

const app = express();
app.use(express.json());

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Health check — used by uptime monitor
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', botReady: client.isReady() });
});

// Webhook receiver — NestJS backend posts events here
app.post('/webhook', authMiddleware, async (req, res) => {
  const parsed = AnyEvent.safeParse(req.body);
  if (!parsed.success) {
    logger.warn({ errors: parsed.error.issues }, 'Invalid webhook payload');
    res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues });
    return;
  }

  const event = parsed.data;

  if (isDuplicate(event.eventId)) {
    logger.info({ eventId: event.eventId }, 'Duplicate event dropped');
    res.status(200).json({ status: 'duplicate' });
    return;
  }

  logger.info({ eventId: event.eventId, type: event.type }, 'Event received');

  await routeEvent(client, event);

  res.status(200).json({ status: 'ok' });
});

async function start(): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    logger.error('DISCORD_BOT_TOKEN is not set — cannot start');
    process.exit(1);
  }

  const port = parseInt(process.env.PORT ?? '4000', 10);

  await client.login(token);
  logger.info({ tag: client.user?.tag }, 'Discord bot logged in');

  app.listen(port, () => {
    logger.info({ port }, 'Webhook server listening');
  });
}

start().catch((err) => {
  logger.error(err, 'Fatal startup error');
  process.exit(1);
});
