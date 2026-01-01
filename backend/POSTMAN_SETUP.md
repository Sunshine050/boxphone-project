# Postman Collection Setup Guide

## 📥 การ Import Collection

### วิธีที่ 1: Import จากไฟล์

1. เปิด Postman
2. คลิก **Import** (มุมซ้ายบน)
3. เลือก **File** tab
4. เลือกไฟล์ `postman_collection.json`
5. คลิก **Import**

### วิธีที่ 2: Import Environment (Optional)

1. เปิด Postman
2. คลิก **Import**
3. เลือกไฟล์ `postman_environment.json`
4. คลิก **Import**
5. เลือก Environment ที่ import มา (มุมขวาบน)

---

## 🔧 การตั้งค่า

### 1. ตั้งค่า Base URL

- Collection จะใช้ `{{base_url}}` ซึ่ง default เป็น `http://localhost:3001`
- ถ้าต้องการเปลี่ยน:
  - คลิกขวาที่ Collection → **Edit**
  - ไปที่ tab **Variables**
  - แก้ไข `base_url` ตามต้องการ

### 2. Environment Variables (ถ้าใช้ Environment)

ถ้า import Environment มาแล้ว:
- `base_url`: `http://localhost:3001`
- `admin_token`: จะถูก set อัตโนมัติเมื่อ login
- `user_id`: จะถูก set อัตโนมัติเมื่อสร้าง user
- `device_id`: จะถูก set อัตโนมัติเมื่อสร้าง device
- `device2_id`: จะถูก set อัตโนมัติเมื่อสร้าง device ตัวที่ 2
- `session_id`: จะถูก set อัตโนมัติเมื่อสร้าง session

---

## 🚀 วิธีใช้งาน

### Step 1: Login

1. เปิด folder **Auth**
2. รัน request **Login (Admin)**
3. Token จะถูกบันทึกอัตโนมัติใน Collection Variables

### Step 2: สร้าง User

1. เปิด folder **Users**
2. รัน request **Create User (Admin)**
3. User ID จะถูกบันทึกอัตโนมัติ

### Step 3: สร้าง Device

1. เปิด folder **Devices**
2. รัน request **Create Device**
3. Device ID จะถูกบันทึกอัตโนมัติ
4. รันอีกครั้งเพื่อสร้าง Device ตัวที่ 2 (Device 2 ID จะถูกบันทึกอัตโนมัติ)

### Step 4: สร้าง Session

1. เปิด folder **Sessions**
2. รัน request **Create Session**
3. Session ID จะถูกบันทึกอัตโนมัติ

### Step 5: ทดสอบ Session Operations

- **Pause Session**: หยุด session (จำลองเครื่องหลุด)
- **Get Remaining Time**: ดูเวลาที่เหลือ
- **Move Session**: ย้าย session ไปเครื่องอื่น
- **Get Move Logs**: ดู log การย้าย
- **Resume Session**: เริ่ม session ต่อ

---

## 📋 Checklist การเทส

### Basic Flow
- [ ] Login สำเร็จ → Token ถูกบันทึก
- [ ] สร้าง User สำเร็จ → User ID ถูกบันทึก
- [ ] สร้าง Device สำเร็จ → Device ID ถูกบันทึก
- [ ] สร้าง Session สำเร็จ → Session ID ถูกบันทึก

### Session Management
- [ ] Pause Session → `remaining_seconds` freeze
- [ ] Get Remaining Time → แสดงเวลาที่เหลือ
- [ ] Move Session → `remaining_seconds` ไม่เปลี่ยน
- [ ] Get Move Logs → แสดง log การย้าย
- [ ] Resume Session → Session เริ่มต่อ

### Error Cases
- [ ] สร้าง Session ซ้ำ → Error (User มี session active อยู่แล้ว)
- [ ] ย้าย Session ไป Device ที่ถูกใช้ → Error
- [ ] ย้าย Session เกิน limit → Error

---

## 🔍 ตรวจสอบ Variables

### ดู Collection Variables

1. คลิกขวาที่ Collection → **Edit**
2. ไปที่ tab **Variables**
3. ดูค่าทั้งหมด

### ดู Environment Variables (ถ้าใช้)

1. คลิกที่ Environment dropdown (มุมขวาบน)
2. เลือก Environment
3. คลิก **View** (👁️ icon)
4. ดูค่าทั้งหมด

---

## 💡 Tips

1. **Auto-save Variables**: Collection จะบันทึก ID อัตโนมัติเมื่อ request สำเร็จ
2. **Token Expiry**: ถ้า token หมดอายุ ให้ login ใหม่
3. **Test Scripts**: แต่ละ request มี test script ที่จะบันทึก ID อัตโนมัติ
4. **Error Handling**: ตรวจสอบ response code และ message เมื่อเกิด error

---

## 🐛 Troubleshooting

### Token ไม่ถูกบันทึก
- ตรวจสอบว่า Login request สำเร็จ (status 200)
- ตรวจสอบ response มี `access_token` หรือไม่
- ดู Console ใน Postman (View → Show Postman Console)

### Variables ไม่ถูกบันทึก
- ตรวจสอบว่า request สำเร็จ (status 200/201)
- ตรวจสอบ response structure ตรงกับที่คาดหวัง
- ดู Test Results tab ใน response

### Request Failed
- ตรวจสอบว่า backend server ทำงานอยู่ (`npm run start:dev`)
- ตรวจสอบ base_url ถูกต้อง
- ตรวจสอบ token ยังไม่หมดอายุ

---

## 📚 API Endpoints ที่มีใน Collection

### Auth
- `POST /auth/login` - Login เป็น Admin

### Users
- `POST /users` - สร้าง User
- `GET /users` - ดึง Users ทั้งหมด
- `GET /users/:id` - ดึง User จาก ID
- `GET /users/me` - ดึง Profile ของตัวเอง
- `PATCH /users/:id` - อัปเดต User
- `POST /users/:id/connect-device` - เชื่อม User กับ Device
- `POST /users/:id/disconnect-device` - ยกเลิกการเชื่อม
- `DELETE /users/:id` - ลบ User

### Devices
- `POST /devices` - สร้าง Device
- `GET /devices` - ดึง Devices ทั้งหมด
- `GET /devices/:id` - ดึง Device จาก ID
- `PATCH /devices/:id` - อัปเดต Device
- `DELETE /devices/:id` - ลบ Device

### Sessions
- `POST /sessions` - สร้าง Session
- `GET /sessions` - ดึง Sessions ทั้งหมด
- `GET /sessions/:id` - ดึง Session จาก ID
- `GET /sessions/user/:userId` - ดึง Session ที่ active ของ User
- `GET /sessions/device/:deviceId` - ดึง Session ที่ active ของ Device
- `GET /sessions/:id/remaining` - ดูเวลาที่เหลือ
- `POST /sessions/:id/pause` - หยุด Session
- `POST /sessions/:id/resume` - เริ่ม Session ต่อ
- `POST /sessions/:id/move` - ย้าย Session ไปเครื่องอื่น
- `GET /sessions/:id/move-logs` - ดึง Move Logs
- `POST /sessions/:id/cancel` - ยกเลิก Session

---

## ✅ Ready to Test!

ตอนนี้พร้อมเทส API ทั้งหมดแล้ว! เริ่มจาก Login แล้วทำตามลำดับตาม Checklist ด้านบน

