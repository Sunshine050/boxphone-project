import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { Notification, NotificationSchema } from './notification.schema';
import { NotificationController } from './notification.controller';

@Global()
@Module({
    imports: [

        MongooseModule.forFeature([
            { name: Notification.name, schema: NotificationSchema }
        ]),
    ],
    controllers: [NotificationController],
    providers: [
        NotificationService,
        NotificationGateway
    ],
    exports: [
        NotificationService
    ],
})
export class NotificationModule { }