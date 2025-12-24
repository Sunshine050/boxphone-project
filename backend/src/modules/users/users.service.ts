import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

/**
 * Users Service - จัดการข้อมูล User ใน Database
 * 
 * เพิ่ม findById เพื่อให้ AuthService ดึงข้อมูลได้
 */
@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    async create(createUserDto: any): Promise<User> {
        const createdUser = new this.userModel(createUserDto);
        return createdUser.save();
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
     * ลบ User (สำหรับ Admin)
     */
    async delete(userId: string): Promise<void> {
        await this.userModel.findByIdAndDelete(userId).exec();
    }
}
