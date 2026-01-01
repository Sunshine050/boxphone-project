# Bruno Collection - Backend API

## วิธีเปิด Collection ใน Bruno

1. เปิด Bruno
2. คลิก **"Open Collection"** (ไม่ใช่ Import Collection)
3. เลือกโฟลเดอร์ `backend/bruno` (โฟลเดอร์ที่มี `bruno.json` อยู่)
4. Collection จะโหลดและแสดงโครงสร้างดังนี้:
   - **Auth** - Authentication endpoints
   - **Users** - User management endpoints
   - **Devices** - Device management endpoints
   - **Sessions** - Session management endpoints

## Variables

Collection ใช้ variables จากไฟล์ `env.bru`:
- `base_url`: http://localhost:3001
- `admin_username`: admin
- `admin_password`: admin123456
- `test_username`: testuser
- `test_password`: password123
- และอื่นๆ

Variables ที่จะถูก set อัตโนมัติเมื่อรัน requests:
- `admin_token`: ถูก set เมื่อ login สำเร็จ
- `user_id`: ถูก set เมื่อสร้าง user สำเร็จ
- `device_id`: ถูก set เมื่อสร้าง device ตัวแรกสำเร็จ
- `device2_id`: ถูก set เมื่อสร้าง device ตัวที่สองสำเร็จ
- `session_id`: ถูก set เมื่อสร้าง session สำเร็จ

## ลำดับการทดสอบ

1. **Auth → Login (Admin)**: Login เพื่อรับ token
2. **Users → Create User (Admin)**: สร้าง user ใหม่
3. **Devices → Create Device**: สร้าง device ตัวแรก
4. **Devices → Create Device**: สร้าง device ตัวที่สอง (สำหรับ Move Session)
5. **Users → Connect User to Device**: เชื่อม user กับ device
6. **Sessions → Create Session**: สร้าง session
7. **Sessions → Get Remaining Time**: ตรวจสอบเวลาที่เหลือ
8. **Sessions → Pause Session**: หยุด session (จำลอง disconnect)
9. **Sessions → Move Session**: ย้าย session ไป device อื่น
10. **Sessions → Get Move Logs**: ดู log การย้าย session

## หมายเหตุ

- ต้องแน่ใจว่า backend server กำลังรันอยู่ที่ `http://localhost:3001`
- ตรวจสอบว่า `.env` มี `ADMIN_PASSWORD=admin123456` ตรงกับ `env.bru`
- ถ้า login ไม่ได้ ให้รัน script `backend/scripts/create-admin.ts` เพื่อสร้าง admin user

