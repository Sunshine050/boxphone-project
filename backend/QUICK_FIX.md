# Quick Fix: 401 Unauthorized Error

## ปัญหา

Login ได้ 401 Unauthorized "Invalid credentials"

## สาเหตุ

Admin user ยังไม่ได้ถูกสร้างใน database

## วิธีแก้

### Step 1: ตรวจสอบไฟล์ .env

สร้างไฟล์ `.env` ในโฟลเดอร์ `backend/` (ถ้ายังไม่มี) โดย copy จาก `.env.example`:

```env
MONGO_URI=mongodb://localhost:27017/boxphon
JWT_SECRET=your-secret-key
JWT_EXPIRATION=1d
PORT=3001
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
BCRYPT_SALT_ROUNDS=10
DEFAULT_USER_CREDITS=0
ADMIN_CREDITS=999999
SESSION_MAX_MOVE_COUNT=2
SESSION_DEFAULT_DISCONNECT_REASON=Device disconnected
```

### Step 2: Restart Backend Server

1. หยุด backend server (ถ้ากำลังรันอยู่)
2. เริ่มใหม่:
   ```bash
   cd backend
   npm run start:dev
   ```
3. ตรวจสอบ console ว่ามีข้อความ:
   - `✓ Admin user created: admin` หรือ
   - `✓ Admin user already exists`

### Step 3: ลอง Login อีกครั้ง

ใน Bruno:

1. เปิด request "Login (Admin)"
2. กด Send
3. ควรได้ Status 200 และ access_token

---

## วิธีที่ 2: สร้าง Admin User ผ่าน Register API

ถ้า seed ไม่ทำงาน สามารถสร้าง admin user ผ่าน Register API:

### ใน Bruno:

1. เปิด folder "Auth"
2. สร้าง request ใหม่ (หรือใช้ Register ถ้ามี)
3. ใช้ endpoint: `POST {{base_url}}/auth/register`
4. Body:
   ```json
   {
     "username": "admin",
     "password": "admin123",
     "role": "ADMIN"
   }
   ```
5. กด Send
6. ควรได้ Status 201
7. ลอง Login อีกครั้ง

---

## ตรวจสอบว่า Backend ทำงานอยู่

1. เปิด browser ไปที่ `http://localhost:3001`
2. ควรเห็น response (อาจเป็น 404 หรือ error อื่น แต่ไม่ใช่ connection refused)
3. ถ้า connection refused = backend ไม่ทำงาน → ต้อง start server ก่อน

---

## Checklist

- [ ] มีไฟล์ `.env` ใน `backend/` folder
- [ ] `.env` มี `ADMIN_USERNAME=admin` และ `ADMIN_PASSWORD=admin123`
- [ ] Backend server ทำงานอยู่ (ดู console)
- [ ] MongoDB ทำงานอยู่
- [ ] Console แสดง "✓ Admin user created" หรือ "✓ Admin user already exists"
- [ ] ลอง Login อีกครั้ง
