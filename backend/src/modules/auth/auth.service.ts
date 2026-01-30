import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';


@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Login - ตรวจสอบ Username/Password
     * @returns JWT Access Token และข้อมูล User
     */

    async login(loginDto: LoginDto) {
        const { username } = loginDto;

        this.logger.log(`[LOGIN] Attempt username="${username}"`);

        // 1. หา user
        const user = await this.usersService.findByUsername(username);

        if (!user) {
            this.logger.warn(`[LOGIN] ❌ User not found: "${username}"`);
            throw new UnauthorizedException("Invalid credentials");
        }

        this.logger.debug(
            `[LOGIN] User found id=${(user as any)._id.toString()} role=${user.role}`
        );

        // 2. ตรวจ password
        const isValid = await bcrypt.compare(
            loginDto.password,
            user.password_hash
        );

        if (!isValid) {
            this.logger.warn(
                `[LOGIN] ❌ Invalid password for username="${username}"`
            );
            throw new UnauthorizedException("Invalid credentials");
        }

        // 3. สร้าง JWT payload
        const userId = (user as any)._id.toString();

        const payload = {
            sub: userId,           // ✅ ใช้ sub แค่ใน token
            username: user.username,
            role: user.role,
        };

        // 4. sign token
        const token = this.jwtService.sign(payload);

        this.logger.log(
            `[LOGIN] ✅ Success username="${username}" id=${userId} role=${user.role}`
        );

        // 5. response (❗ frontend จะใช้ id ไม่ใช่ sub)
        return {
            access_token: token,
            user: {
                id: userId,          // ✅ frontend / controller ใช้ id
                username: user.username,
                role: user.role,
            },
        };
    }

    /**
     * Register - สร้าง User ใหม่
     * Hash Password ด้วย bcrypt ก่อนบันทึกลง Database
     */
    async register(registerDto: RegisterDto) {
        const existingUser = await this.usersService.findByUsername(registerDto.username);
        if (existingUser) {
            throw new ConflictException('Username already exists');
        }

        // Hash password
        const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS');
        if (!saltRounds) {
            throw new Error('BCRYPT_SALT_ROUNDS is not configured');
        }
        const password_hash = await bcrypt.hash(registerDto.password, saltRounds);

        const user = await this.usersService.create({
            username: registerDto.username,
            password_hash,
            role: registerDto.role,
        });

        return {
            message: 'User created successfully',
            user: {
                id: (user as any).id || (user as any)._id.toString(),
                username: user.username,
                role: user.role,
            },
        };
    }


    async validateUser(userId: string) {
        return await this.usersService.findById(userId);
    }
}
