import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/user.schema';
import { WebhookEmitterService } from './webhook-emitter.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [WebhookEmitterService],
  exports: [WebhookEmitterService],
})
export class DiscordModule {}
