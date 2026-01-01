# Bruno API Client Setup Guide

## 📥 การ Import Collection

### วิธีที่ 1: Open Collection (แนะนำ)

1. เปิด Bruno
2. คลิก **"Open Collection"** หรือกด `Ctrl+O` (Windows) / `Cmd+O` (Mac)
3. เลือกโฟลเดอร์ `backend/bruno`
4. Bruno จะโหลด collection ทั้งหมดอัตโนมัติ

### วิธีที่ 2: Import Postman Collection (ถ้าต้องการ)

Bruno รองรับการ import Postman Collection v2.1:

1. เปิด Bruno
2. คลิก **"Import Collection"**
3. เลือกไฟล์ `backend/postman_collection.json`
4. Bruno จะแปลงเป็น Bruno format อัตโนมัติ

---

## 🔧 การตั้งค่า Variables

### 1. ตั้งค่า Collection Variables

1. คลิกขวาที่ Collection **"Bruno Backend API"**
2. เลือก **"Edit Collection"**
3. ไปที่ tab **"Vars"**
4. ไปที่ส่วน **"Pre Request"**
5. เพิ่ม variables ต่อไปนี้:

**Variables ที่ต้องตั้งค่าตอนนี้:**
```
base_url = http://localhost:3001
admin_username = admin
admin_password = admin123
test_username = testuser
test_password = password123
user_package = BASIC
device_name = Test Device 1
device_serial = DEVICE001
device_model = Test Model
```

**Variables ที่จะถูก set อัตโนมัติ (ไม่ต้องตั้งค่าตอนนี้):**
```
admin_token = (จะถูก set อัตโนมัติเมื่อ login)
user_id = (จะถูก set อัตโนมัติเมื่อสร้าง user)
device_id = (จะถูก set อัตโนมัติเมื่อสร้าง device)
device2_id = (จะถูก set อัตโนมัติเมื่อสร้าง device ตัวที่ 2)
session_id = (จะถูก set อัตโนมัติเมื่อสร้าง session)
```

### 2. Auto-save Variables

Bruno collection มี test scripts ที่จะบันทึก variables อัตโนมัติ:
- **Login (Admin)** → บันทึก `admin_token`
- **Create User** → บันทึก `user_id`
- **Create Device** → บันทึก `device_id` หรือ `device2_id`
- **Create Session** → บันทึก `session_id`

**หมายเหตุ:** 
- ข้อมูล username, password, device info ใช้ variables จาก `.env` หรือตั้งค่าใน Bruno Variables
- ไม่มี hardcode ใน collection files แล้ว

---

## 🚀 วิธีใช้งาน

### Step 1: Login

1. เปิด folder **Auth**
2. รัน request **"Login (Admin)"**
3. ตรวจสอบใน **Tests** tab ว่า `admin_token` ถูกบันทึกแล้ว
4. ตรวจสอบใน Collection Variables ว่า token ถูกบันทึก

### Step 2: สร้าง User

1. เปิด folder **Users**
2. รัน request **"Create User (Admin)"**
3. ตรวจสอบว่า `user_id` ถูกบันทึกใน Collection Variables

### Step 3: สร้าง Device

1. เปิด folder **Devices**
2. รัน request **"Create Device"**
3. ตรวจสอบว่า `device_id` ถูกบันทึก
4. รันอีกครั้งเพื่อสร้าง Device ตัวที่ 2 (`device2_id`)

### Step 4: สร้าง Session

1. เปิด folder **Sessions**
2. รัน request **"Create Session"**
3. ตรวจสอบว่า `session_id` ถูกบันทึก

### Step 5: ทดสอบ Session Operations

- **Pause Session**: หยุด session (จำลองเครื่องหลุด)
- **Get Remaining Time**: ดูเวลาที่เหลือ
- **Move Session**: ย้าย session ไปเครื่องอื่น
- **Get Move Logs**: ดู log การย้าย
- **Resume Session**: เริ่ม session ต่อ

---

## 📋 Checklist การเทส

### Basic Flow
- [ ] Login สำเร็จ → `admin_token` ถูกบันทึก
- [ ] สร้าง User สำเร็จ → `user_id` ถูกบันทึก
- [ ] สร้าง Device สำเร็จ → `device_id` ถูกบันทึก
- [ ] สร้าง Session สำเร็จ → `session_id` ถูกบันทึก

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

1. คลิกขวาที่ Collection → **"Edit Collection"**
2. ไปที่ tab **"Variables"**
3. ดูค่าทั้งหมด

### ดู Variables ใน Request

1. เปิด request ใดๆ
2. ดูใน **Variables** panel (ด้านขวา)
3. หรือใช้ `{{variable_name}}` ใน URL/body

---

## 💡 Tips

1. **Auto-save Variables**: Collection จะบันทึก ID อัตโนมัติเมื่อ request สำเร็จ
2. **Test Scripts**: แต่ละ request มี test scripts ที่จะบันทึก ID อัตโนมัติ
3. **Keyboard Shortcuts**: กด `Ctrl+K` (Windows) / `Cmd+K` (Mac) เพื่อค้นหา requests
4. **Environment**: Bruno ใช้ file-based collection ไม่ต้องใช้ environment แยก

---

## 🐛 Troubleshooting

### Variables ไม่ถูกบันทึก
- ตรวจสอบว่า request สำเร็จ (status 200/201)
- ตรวจสอบ response structure ตรงกับที่คาดหวัง
- ดูใน **Tests** tab ว่า test scripts รันสำเร็จหรือไม่

### Request Failed
- ตรวจสอบว่า backend server ทำงานอยู่ (`npm run start:dev`)
- ตรวจสอบ `base_url` ถูกต้อง
- ตรวจสอบ `admin_token` ยังไม่หมดอายุ

### Collection ไม่แสดง
- ตรวจสอบว่าเปิดโฟลเดอร์ `backend/bruno` ที่ถูกต้อง
- ตรวจสอบว่าไฟล์ `.bru` อยู่ในโฟลเดอร์ที่ถูกต้อง

---

## 📚 API Endpoints ที่มีใน Collection

### Auth (1 endpoint)
- `POST /auth/login` - Login เป็น Admin

### Users (8 endpoints)
- `POST /users` - สร้าง User
- `GET /users` - ดึง Users ทั้งหมด
- `GET /users/:id` - ดึง User จาก ID
- `GET /users/me` - ดึง Profile ของตัวเอง
- `PATCH /users/:id` - อัปเดต User
- `POST /users/:id/connect-device` - เชื่อม User กับ Device
- `POST /users/:id/disconnect-device` - ยกเลิกการเชื่อม
- `DELETE /users/:id` - ลบ User

### Devices (5 endpoints)
- `POST /devices` - สร้าง Device
- `GET /devices` - ดึง Devices ทั้งหมด
- `GET /devices/:id` - ดึง Device จาก ID
- `PATCH /devices/:id` - อัปเดต Device
- `DELETE /devices/:id` - ลบ Device

### Sessions (11 endpoints)
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

---

## 📝 หมายเหตุ

- Bruno ใช้ไฟล์ `.bru` สำหรับเก็บ requests
- Collection structure อยู่ในโฟลเดอร์ `backend/bruno`
- Variables จะถูกบันทึกใน Collection level
- Test scripts ใช้ JavaScript (Bruno's test framework)

