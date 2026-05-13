import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { User, UserDocument } from '../users/user.schema';

export type WebhookEventType =
  | 'session_start'
  | 'session_end'
  | 'session_warning'
  | 'device_offline'
  | 'device_online';

export interface EmitOptions {
  type: WebhookEventType;
  userId: string;
  deviceId: string;
  deviceName?: string;
  sessionId?: string;
}

@Injectable()
export class WebhookEmitterService {
  private readonly logger = new Logger(WebhookEmitterService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {}

  async emit(opts: EmitOptions): Promise<void> {
    const user = await this.userModel
      .findById(opts.userId)
      .select('discord_id')
      .lean()
      .exec();

    if (!user?.discord_id) return;

    const botUrl = this.configService.get<string>('DISCORD_BOT_URL');
    const secret = this.configService.get<string>('WEBHOOK_SECRET');

    if (!botUrl || !secret) {
      this.logger.warn('[WebhookEmitter] DISCORD_BOT_URL or WEBHOOK_SECRET not configured');
      return;
    }

    const payload: Record<string, unknown> = {
      eventId: crypto.randomUUID(),
      type: opts.type,
      timestamp: new Date().toISOString(),
      discordUserId: user.discord_id,
      deviceId: opts.deviceId,
      deviceName: opts.deviceName ?? opts.deviceId,
      userId: opts.userId,
    };

    if (opts.sessionId) {
      payload.sessionId = opts.sessionId;
    }

    try {
      await axios.post(`${botUrl}/webhook`, payload, {
        headers: { 'X-Webhook-Secret': secret },
        timeout: 5000,
      });
      this.logger.log(`[WebhookEmitter] ${opts.type} emitted for user ${opts.userId}`);
    } catch (e: any) {
      this.logger.warn(`[WebhookEmitter] Failed to emit ${opts.type}: ${e?.message}`);
    }
  }
}
