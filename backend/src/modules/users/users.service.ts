import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument, UserStatus } from './user.schema';
import * as bcrypt from 'bcrypt';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto';
import { DeviceStatus } from '../devices/device.schema';


@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private readonly configService: ConfigService,
    ) { }

    async create(createUserDto: any): Promise<User> {
        const createdUser = new this.userModel(createUserDto);
        return createdUser.save();
    }

    /**
     * สร้าง User โดยแอดมิน
     * - Hash password
     * - ตั้ง start_date เป็นวันที่ปัจจุบัน
     * - ตั้ง status เป็น PENDING (จะเปลี่ยนเป็น INUSE เมื่อเชื่อม device)
     */
    async createByAdmin(createUserDto: CreateUserByAdminDto): Promise<User> {
        // เช็คว่า Username ซ้ำหรือไม่
        const existingUser = await this.findOne(createUserDto.username);
        if (existingUser) {
            throw new ConflictException('Username already exists');
        }

        // Hash password
        const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS');
        if (!saltRounds) {
            throw new Error('BCRYPT_SALT_ROUNDS is not configured');
        }
        const password_hash = await bcrypt.hash(createUserDto.password, saltRounds);

        // สร้าง User ใหม่
        const defaultCredits = this.configService.get<number>('DEFAULT_USER_CREDITS');
        if (defaultCredits === undefined) {
            throw new Error('DEFAULT_USER_CREDITS is not configured');
        }
        const newUser = new this.userModel({
            username: createUserDto.username,
            password_hash,
            role: createUserDto.role,
            package: createUserDto.package,
            status: UserStatus.PENDING,
            start_date: new Date(),  // เริ่มนับตั้งแต่วันที่สร้าง
            device_id: null,
            credits: defaultCredits,
        });

        return newUser.save();
    }

    async findAll(): Promise<User[]> {
        return this.userModel.find().exec();
    }

    async findOne(username: string): Promise<User | null> {
        return this.userModel.findOne({ username }).exec();
    }

    /**
     * ดึง User จาก ID (ใช้โดย JWT Strategy)
     */
    async findById(userId: string): Promise<User | null> {
        return this.userModel.findById(userId).exec();
    }

    /**
     * อัปเดตข้อมูล User
     */
    async update(userId: string, updateUserDto: any): Promise<User | null> {
        // ถ้ามีการแก้ Password ต้อง Hash ใหม่ด้วย
        if (updateUserDto.password) {
            const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS');
            if (!saltRounds) {
                throw new Error('BCRYPT_SALT_ROUNDS is not configured');
            }
            updateUserDto.password_hash = await bcrypt.hash(updateUserDto.password, saltRounds);
            delete updateUserDto.password;
        }
        return this.userModel.findByIdAndUpdate(userId, updateUserDto, { new: true }).exec();
    }

    /**
     * เชื่อม User กับ Device
     * - เปลี่ยน status เป็น INUSE
     * - บันทึก device_id
     * - ต้องเช็คว่า device มีอยู่จริงและว่างอยู่
     */
    async connectDevice(userId: string, deviceId: string, deviceService: any): Promise<User> {
        const user = await this.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // เช็คว่า device มีอยู่จริง
        const device = await deviceService.findOne(deviceId);
        if (!device) {
            throw new NotFoundException('Device not found');
        }

        // เช็คว่า device ว่างอยู่หรือไม่ (ไม่มี user อื่นใช้อยู่)
        if (device.current_user_id && device.current_user_id !== userId) {
            throw new BadRequestException('Device is already in use by another user');
        }

        // เช็คว่า user มี device อยู่แล้วหรือไม่
        if (user.device_id && user.device_id.toString() !== deviceId) {
            throw new BadRequestException('User is already connected to another device');
        }

        // อัปเดต User: เปลี่ยน status เป็น INUSE และบันทึก device_id
        const updatedUser = await this.userModel.findByIdAndUpdate(
            userId,
            {
                status: UserStatus.INUSE,
                device_id: deviceId,
            },
            { new: true }
        ).exec();

        // อัปเดต Device: บันทึก current_user_id และเปลี่ยน status เป็น BUSY
        await deviceService.update(deviceId, {
            current_user_id: userId,
            status: DeviceStatus.BUSY,
        });

        return updatedUser;
    }

    /**
     * ยกเลิกการเชื่อม User กับ Device
     * - เปลี่ยน status กลับเป็น PENDING
     * - ลบ device_id
     * - อัปเดต device ให้ลบ current_user_id
     */
    async disconnectDevice(userId: string, deviceService: any): Promise<User> {
        const user = await this.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (!user.device_id) {
            throw new BadRequestException('User is not connected to any device');
        }

        // อัปเดต User: เปลี่ยน status เป็น PENDING และลบ device_id
        const updatedUser = await this.userModel.findByIdAndUpdate(
            userId,
            {
                status: UserStatus.PENDING,
                device_id: null,
            },
            { new: true }
        ).exec();

        // อัปเดต Device: ลบ current_user_id และเปลี่ยน status เป็น AVAILABLE
        await deviceService.update(user.device_id.toString(), {
            current_user_id: null,
            status: DeviceStatus.AVAILABLE,
        });

        return updatedUser;
    }

    /**
     * ลบ User (สำหรับ Admin)
     */
    async delete(userId: string): Promise<void> {
        await this.userModel.findByIdAndDelete(userId).exec();
    }
}
