import { EmbedBuilder, Colors } from 'discord.js';
import type { AnyEvent } from '../types/events';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} นาที ${s} วินาที` : `${s} วินาที`;
}

function formatRemaining(seconds: number): string {
  const m = Math.ceil(seconds / 60);
  return m <= 1 ? 'น้อยกว่า 1 นาที' : `${m} นาที`;
}

export function buildEmbed(event: AnyEvent): EmbedBuilder {
  const embed = new EmbedBuilder().setTimestamp();

  switch (event.type) {
    case 'session_start':
      return embed
        .setTitle('📱 เริ่มใช้งานอุปกรณ์')
        .setDescription(`คุณเริ่มใช้งาน **${event.deviceName}** แล้ว`)
        .setColor(Colors.Green);

    case 'session_end':
      return embed
        .setTitle('⏱️ สิ้นสุดการใช้งาน')
        .setDescription(`การใช้งาน **${event.deviceName}** สิ้นสุดแล้ว`)
        .addFields({ name: 'ระยะเวลา', value: formatDuration(event.durationSeconds) })
        .setColor(Colors.Orange);

    case 'session_warning':
      return embed
        .setTitle('⚠️ เวลาใกล้หมดแล้ว')
        .setDescription(
          `เหลือเวลาอีก **${formatRemaining(event.remainingSeconds)}** บนอุปกรณ์ **${event.deviceName}**`,
        )
        .setColor(Colors.Yellow);

    case 'device_offline':
      return embed
        .setTitle('🔴 อุปกรณ์ออฟไลน์')
        .setDescription(`อุปกรณ์ **${event.deviceName}** ไม่สามารถเชื่อมต่อได้`)
        .setColor(Colors.Red);

    case 'device_online':
      return embed
        .setTitle('🟢 อุปกรณ์ออนไลน์')
        .setDescription(`อุปกรณ์ **${event.deviceName}** เชื่อมต่อแล้ว`)
        .setColor(Colors.Green);

  }
}
