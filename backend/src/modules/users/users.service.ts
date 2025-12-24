import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';


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
     * อัปเดตข้อมูล User
     */
    async update(userId: string, updateUserDto: any): Promise<User | null> {
        // ถ้ามีการแก้ Password ต้อง Hash ใหม่ด้วย
        if (updateUserDto.password) {
            const bcrypt = require('bcrypt');
            const saltRounds = 10;
            updateUserDto.password_hash = await bcrypt.hash(updateUserDto.password, saltRounds);
            delete updateUserDto.password;
        }
        return this.userModel.findByIdAndUpdate(userId, updateUserDto, { new: true }).exec();
    }

    /**
     * ลบ User (สำหรับ Admin)
     */
    async delete(userId: string): Promise<void> {
        await this.userModel.findByIdAndDelete(userId).exec();
    }
}
