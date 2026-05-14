import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, InjectConnection } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { Connection } from 'mongoose';
import { AppGateway } from './gateway/app.gateway';
import { DevicesModule } from './modules/devices/devices.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { NotificationModule } from './modules/notification/notification.module';
import { LogModule } from './modules/log/log.module';
import { SystemModule } from './modules/system/system.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      expandVariables: true,
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const mongoUri = configService.get<string>('MONGO_URI');

        if (!mongoUri) {
          throw new Error('❌ MONGO_URI is not configured in .env');
        }

        if (
          !mongoUri.startsWith('mongodb://') &&
          !mongoUri.startsWith('mongodb+srv://')
        ) {
          throw new Error(
            `❌ Invalid MONGO_URI format: ${mongoUri}`,
          );
        }

        return { uri: mongoUri };
      },
    }),

    ScheduleModule.forRoot(),
    LogModule,
    AuthModule,
    UsersModule,
    DevicesModule,
    NotificationModule,
    SessionsModule,
    SystemModule,
  ],
  providers: [AppGateway],
})
export class AppModule implements OnModuleInit {
  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  onModuleInit() {
    if (this.connection.readyState === 1) {
      console.log(
        '✅ MongoDB Connected Successfully to:',
        this.connection.name,
      );
    } else {
      console.error(
        '❌ MongoDB Connection Failed! State:',
        this.connection.readyState,
      );
    }
  }
}
