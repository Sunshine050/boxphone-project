import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppGateway } from './gateway/app.gateway';
import { DevicesModule } from './modules/devices/devices.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SessionsModule } from './modules/sessions/sessions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const mongoUri = configService.get<string>('MONGO_URI');
        if (!mongoUri) {
          throw new Error('MONGO_URI is not configured in .env file');
        }
        if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
          throw new Error(`Invalid MONGO_URI format. Must start with 'mongodb://' or 'mongodb+srv://'. Current value: ${mongoUri}`);
        }
        return {
          uri: mongoUri,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    DevicesModule,
    SessionsModule,
  ],
  controllers: [],
  providers: [AppGateway],
})
export class AppModule implements OnModuleInit {
  constructor(@InjectConnection() private readonly connection: Connection) { }

  onModuleInit() {
    if (this.connection.readyState === 1) {
      console.log('✅ MongoDB Connected Successfully to:', this.connection.name);
    } else {
      console.error('❌ MongoDB Connection Failed! Current state:', this.connection.readyState);
    }
  }
}
