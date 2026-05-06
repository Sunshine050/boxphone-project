import { Client, EmbedBuilder } from 'discord.js';
import logger from '../lib/logger';

export async function sendUserDM(client: Client, discordUserId: string, embed: EmbedBuilder): Promise<void> {
  try {
    const user = await client.users.fetch(discordUserId);
    await user.send({ embeds: [embed] });
    logger.info({ discordUserId }, 'DM sent to user');
  } catch (err: any) {
    if (err?.code === 50007) {
      logger.warn({ discordUserId }, 'Cannot send DM — user has DMs disabled');
    } else {
      logger.error({ err, discordUserId }, 'Failed to send DM to user');
    }
  }
}
