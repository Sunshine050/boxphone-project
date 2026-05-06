import { Client } from 'discord.js';
import type { AnyEvent } from '../types/events';
import { buildEmbed } from './embeds';
import { sendAdminDM } from './admin';
import { sendUserDM } from './user';

export async function routeEvent(client: Client, event: AnyEvent): Promise<void> {
  const embed = buildEmbed(event);

  await sendAdminDM(client, embed);

  if (event.discordUserId) {
    await sendUserDM(client, event.discordUserId, embed);
  }
}
