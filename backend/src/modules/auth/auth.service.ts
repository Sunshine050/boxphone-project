import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';


@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    /**
     * Login - ตรวจสอบ Username/Password
     * @returns JWT Access Token และข้อมูล User
     */
    async login(loginDto: LoginDto) {
        const user = await this.usersService.findOne(loginDto.username);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(
            loginDto.password,
            user.password_hash,
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = { sub: (user as any).id || (user as any)._id.toString(), username: user.username, role: user.role };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: (user as any).id || (user as any)._id.toString(),
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
        // เช็คว่า Username ซ้ำหรือไม่
        const existingUser = await this.usersService.findOne(registerDto.username);
        if (existingUser) {
            throw new ConflictException('Username already exists');
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(registerDto.password, saltRounds);

        // บันทึก User
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
