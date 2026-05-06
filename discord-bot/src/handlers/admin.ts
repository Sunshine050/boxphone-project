import { Client, EmbedBuilder } from 'discord.js';
import logger from '../lib/logger';

export async function sendAdminDM(client: Client, embed: EmbedBuilder): Promise<void> {
  const adminId = process.env.ADMIN_DISCORD_ID;
  if (!adminId) {
    logger.warn('ADMIN_DISCORD_ID is not set — skipping admin notification');
    return;
  }

  try {
    const admin = await client.users.fetch(adminId);
    await admin.send({ embeds: [embed] });
    logger.info({ adminId }, 'DM sent to admin');
  } catch (err: any) {
    if (err?.code === 50007) {
      logger.warn({ adminId }, 'Cannot send DM to admin — DMs disabled');
    } else {
      logger.error({ err, adminId }, 'Failed to send DM to admin');
    }
  }
}
