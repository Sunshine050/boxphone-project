# 📋 คู่มือการทดสอบ API - แบบทีละขั้นตอน

## ⚠️ ก่อนเริ่มทดสอบ

1. **ตรวจสอบว่า Backend Server ทำงานอยู่**

   ```bash
   cd backend
   npm run start:dev
   ```

   ควรเห็นข้อความ: `Application is running on: http://[::]:3001`

2. **ตรวจสอบ MongoDB ทำงานอยู่**
   - MongoDB ต้องรันอยู่ที่ `mongodb://localhost:27017`

3. **Import Postman Collection**
   - เปิด Postman
   - Import ไฟล์ `postman_collection.json`
   - ตรวจสอบว่า Collection Variables มี `base_url = http://localhost:3001`

---

## 🚀 ลำดับการทดสอบ (Step by Step)

### **Step 1: Login เป็น Admin** 🔐

**Request:** `Auth → Login (Admin)`

**สิ่งที่ต้องตรวจสอบ:**

- ✅ Status Code: `200`
- ✅ Response มี `access_token`
- ✅ Collection Variable `admin_token` ถูกบันทึกอัตโนมัติ (ดูที่ Test Results)

**Expected Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "admin",
    "role": "ADMIN"
  }
}
```

**ถ้า Login ไม่ได้:**

- ตรวจสอบว่า `.env` มี `ADMIN_PASSWORD=admin123456`
- รัน script: `cd backend && npx ts-node scripts/create-admin.ts`

---

### **Step 2: สร้าง User** 👤

**Request:** `Users → Create User (Admin)`

**สิ่งที่ต้องตรวจสอบ:**

- ✅ Status Code: `201`
- ✅ Response มี `user.id`
- ✅ Collection Variable `user_id` ถูกบันทึกอัตโนมัติ
- ✅ User มี `status: "PENDING"` (ยังไม่ได้เชื่อม device)
- ✅ User มี `start_date` ถูกตั้งค่า

**Expected Response:**

```json
{
  "user": {
    "id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "username": "testuser",
    "role": "USER",
    "package": "BASIC",
    "status": "PENDING",
    "start_date": "2026-01-02T..."
  }
}
```

---

### **Step 3: สร้าง Device ตัวที่ 1** 💻

**Request:** `Devices → Create Device`

**สิ่งที่ต้องตรวจสอบ:**

- ✅ Status Code: `201`
- ✅ Response มี `_id`
- ✅ Collection Variable `device_id` ถูกบันทึกอัตโนมัติ
- ✅ Device มี `status: "AVAILABLE"`

**Expected Response:**

```json
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
  "name": "Test Device 1",
  "serial_number": "DEVICE001",
  "status": "AVAILABLE",
  ...
}
```

---

### **Step 4: สร้าง Device ตัวที่ 2** 💻

**Request:** `Devices → Create Device` (รันอีกครั้ง)

**สิ่งที่ต้องตรวจสอบ:**

- ✅ Status Code: `201`
- ✅ Collection Variable `device2_id` ถูกบันทึกอัตโนมัติ (ตัวแรกจะอยู่ใน `device_id`)

**หมายเหตุ:** ต้องมี Device 2 ตัวเพื่อทดสอบ Move Session

---

### **Step 5: เชื่อม User กับ Device** 🔗

**Request:** `Users → Connect User to Device`

**สิ่งที่ต้องตรวจสอบ:**

- ✅ Status Code: `200` หรือ `201`
- ✅ User `status` เปลี่ยนเป็น `"INUSE"`
- ✅ User มี `device_id` ถูกตั้งค่า
- ✅ Device `status` เปลี่ยนเป็น `"BUSY"`
- ✅ Device มี `current_user_id` ถูกตั้งค่า

**Expected Response:**

```json
{
  "message": "User connected to device successfully",
  "user": {
    "id": "...",
    "status": "INUSE",
    "device_id": "..."
  }
}
```

---

### **Step 6: สร้าง Session** ⏱️

**Request:** `Sessions → Create Session`

**สิ่งที่ต้องตรวจสอบ:**

- ✅ Status Code: `201`
- ✅ Response มี `session.id`
- ✅ Collection Variable `session_id` ถูกบันทึกอัตโนมัติ
- ✅ Session มี `status: "ACTIVE"`
- ✅ Session มี `total_seconds: 7200` (2 ชั่วโมง)
- ✅ Session มี `remaining_seconds: 7200` (เริ่มต้นเท่ากับ total)
- ✅ Session มี `device_id` ถูกตั้งค่า

**Expected Response:**

```json
{
  "session": {
    "id": "65a1b2c3d4e5f6g7h8i9j0k3",
    "user_id": "...",
    "device_id": "...",
    "status": "ACTIVE",
    "total_seconds": 7200,
    "remaining_seconds": 7200,
    "start_time": "2026-01-02T..."
  }
}
```

---

### **Step 7: ตรวจสอบ Remaining Time** ⏰

**Request:** `Sessions → Get Remaining Time`

**สิ่งที่ต้องตรวจสอบ:**

- ✅ Status Code: `200`
- ✅ Response แสดง `remaining_seconds` (ควรลดลงเล็กน้อยจาก 7200)
- ✅ Response แสดง `formatted_time` (เช่น "01:59:58")

**Expected Response:**

```json
{
  "session_id": "...",
  "remaining_seconds": 7198,
  "formatted_time": "01:59:58",
  "status": "ACTIVE"
}
```

**หมายเหตุ:** ถ้ารันทันทีหลังจากสร้าง session เวลาอาจจะยังไม่ลดลงมาก

---

### **Step 8: Pause Session (จำลองเครื่องหลุด)** ⏸️

**Request:** `Sessions → Pause Session`

**สิ่งที่ต้องตรวจสอบ:**

- ✅ Status Code: `200`
- ✅ Session `status` เปลี่ยนเป็น `"DISCONNECTED"`
- ✅ Session มี `pause_time` ถูกตั้งค่า
- ✅ Session มี `disconnect_reason` ถูกตั้งค่า
- ✅ `remaining_seconds` **ถูก freeze** (ไม่ลดลงต่อ)

**Expected Response:**

```json
{
  "message": "Session paused successfully",
  "session": {
    "id": "...",
    "status": "DISCONNECTED",
    "remaining_seconds": 7198,
    "pause_time": "2026-01-02T...",
    "disconnect_reason": "Device disconnected - testing"
  }
}
```

**ทดสอบ:** รัน `Get Remaining Time` อีกครั้ง → `remaining_seconds` ควรเท่าเดิม (ไม่ลดลง)

---

### **Step 9: ตรวจสอบ Session ที่ Disconnected** 🔍

**Request:** `Sessions → Get Session by ID`

**สิ่งที่ต้องตรวจสอบ:**

- ✅ Status Code: `200`
- ✅ Session `status: "DISCONNECTED"`
- ✅ `remaining_seconds` ยังคงค่าเดิม (freeze)

---

### **Step 10: Move Session (ย้ายไปเครื่องอื่น)** 🔄

**Request:** `Sessions → Move Session`

**สิ่งที่ต้องตรวจสอบ:**

- ✅ Status Code: `200`
- ✅ Session `status` เปลี่ยนเป็น `"ACTIVE"`
- ✅ Session `device_id` เปลี่ยนเป็น `device2_id`
- ✅ Session `remaining_seconds` **ไม่เปลี่ยน** (ยังคงค่าเดิม)
- ✅ Session `moved_count` เพิ่มขึ้น (เป็น 1)
- ✅ Session มี `resume_time` ถูกตั้งค่า

**Expected Response:**

```json
{
  "message": "Session moved successfully",
  "session": {
    "id": "...",
    "status": "ACTIVE",
    "device_id": "...", // เปลี่ยนเป็น device2_id
    "remaining_seconds": 7198, // ไม่เปลี่ยน!
    "moved_count": 1,
    "resume_time": "2026-01-02T..."
  }
}
```

**ทดสอบ:** รัน `Get Remaining Time` อีกครั้ง → `remaining_seconds` ควรเริ่มลดลงต่อ (เพราะ status เป็น ACTIVE แล้ว)

---

### **Step 11: ตรวจสอบ Move Logs** 📝

**Request:** `Sessions → Get Move Logs`

**สิ่งที่ต้องตรวจสอบ:**

- ✅ Status Code: `200`
- ✅ Response มี array ของ move logs
- ✅ Log แสดง `from_device_id` และ `to_device_id`
- ✅ Log แสดง `remaining_seconds` ตอนที่ย้าย
- ✅ Log แสดง `moved_by` (user ที่ย้าย)

**Expected Response:**

```json
{
  "logs": [
    {
      "session_id": "...",
      "from_device_id": "...", // device_id
      "to_device_id": "...", // device2_id
      "remaining_seconds": 7198,
      "moved_by": "...",
      "reason": "Device 1 broken, moving to Device 2",
      "createdAt": "2026-01-02T..."
    }
  ]
}
```

---

### **Step 12: Resume Session (ถ้าต้องการ)** ▶️

**Request:** `Sessions → Resume Session`

**หมายเหตุ:** ถ้า Move Session แล้ว status จะเป็น ACTIVE อยู่แล้ว ไม่ต้อง Resume

**ถ้า Session ยังเป็น PAUSED:**

- ✅ Status Code: `200`
- ✅ Session `status` เปลี่ยนเป็น `"ACTIVE"`
- ✅ Session มี `resume_time` ถูกตั้งค่า

---

### **Step 13: ทดสอบ Error Cases** ❌

#### **13.1: สร้าง Session ซ้ำ (User มี Session Active อยู่แล้ว)**

**Request:** `Sessions → Create Session` (ใช้ `user_id` เดิม)

**สิ่งที่ต้องตรวจสอบ:**

- ✅ Status Code: `400` หรือ `409`
- ✅ Error message บอกว่า User มี session active อยู่แล้ว

---

#### **13.2: ย้าย Session ไป Device ที่ถูกใช้อยู่**

**ขั้นตอน:**

1. สร้าง Device ตัวที่ 3
2. สร้าง Session ใหม่สำหรับ Device ตัวที่ 3
3. พยายาม Move Session ไป Device ตัวที่ 3

**สิ่งที่ต้องตรวจสอบ:**

- ✅ Status Code: `400` หรือ `409`
- ✅ Error message บอกว่า Device ถูกใช้อยู่แล้ว

---

#### **13.3: ย้าย Session เกิน Limit**

**ขั้นตอน:**

1. Pause Session อีกครั้ง
2. Move Session ไป Device อื่น (ครั้งที่ 2)
3. Pause Session อีกครั้ง
4. Move Session ไป Device อื่น (ครั้งที่ 3) ← ควร Error

**สิ่งที่ต้องตรวจสอบ:**

- ✅ Status Code: `400`
- ✅ Error message บอกว่า Move เกิน limit แล้ว

**หมายเหตุ:** Default `max_move_count` = 2 (จาก config)

---

### **Step 14: ทดสอบ Get All Sessions** 📋

**Request:** `Sessions → Get All Sessions`

**สิ่งที่ต้องตรวจสอบ:**

- ✅ Status Code: `200`
- ✅ Response เป็น array ของ sessions
- ✅ มี Session ที่สร้างไว้ใน list

---

### **Step 15: ทดสอบ Get Active Session by User** 👤

**Request:** `Sessions → Get Active Session by User`

**สิ่งที่ต้องตรวจสอบ:**

- ✅ Status Code: `200`
- ✅ Response แสดง Session ที่ active ของ User
- ✅ Session `status: "ACTIVE"`

---

### **Step 16: ทดสอบ Get Active Session by Device** 💻

**Request:** `Sessions → Get Active Session by Device`

**สิ่งที่ต้องตรวจสอบ:**

- ✅ Status Code: `200`
- ✅ Response แสดง Session ที่ active ของ Device
- ✅ Session `status: "ACTIVE"`

---

### **Step 17: Cancel Session (ถ้าต้องการ)** 🚫

**Request:** `Sessions → Cancel Session`

**สิ่งที่ต้องตรวจสอบ:**

- ✅ Status Code: `200`
- ✅ Session `status` เปลี่ยนเป็น `"CANCELLED"`

---

## ✅ Checklist สรุป

### Basic Flow

- [ ] Step 1: Login สำเร็จ → `admin_token` ถูกบันทึก
- [ ] Step 2: สร้าง User สำเร็จ → `user_id` ถูกบันทึก, `status: PENDING`
- [ ] Step 3: สร้าง Device 1 สำเร็จ → `device_id` ถูกบันทึก
- [ ] Step 4: สร้าง Device 2 สำเร็จ → `device2_id` ถูกบันทึก
- [ ] Step 5: Connect User to Device → `status: INUSE`
- [ ] Step 6: สร้าง Session สำเร็จ → `session_id` ถูกบันทึก, `status: ACTIVE`

### Session Management (Move Session Feature)

- [ ] Step 7: Get Remaining Time → แสดงเวลาที่เหลือ
- [ ] Step 8: Pause Session → `status: DISCONNECTED`, `remaining_seconds` freeze
- [ ] Step 9: Get Session by ID → ยืนยันว่า `remaining_seconds` ไม่เปลี่ยน
- [ ] Step 10: Move Session → `status: ACTIVE`, `device_id` เปลี่ยน, `remaining_seconds` ไม่เปลี่ยน
- [ ] Step 11: Get Move Logs → แสดง log การย้าย
- [ ] Step 12: Get Remaining Time → `remaining_seconds` เริ่มลดลงต่อ

### Error Cases

- [ ] Step 13.1: สร้าง Session ซ้ำ → Error
- [ ] Step 13.2: ย้ายไป Device ที่ถูกใช้ → Error
- [ ] Step 13.3: ย้ายเกิน Limit → Error

### Additional Tests

- [ ] Step 14: Get All Sessions → แสดง list
- [ ] Step 15: Get Active Session by User → แสดง session ของ user
- [ ] Step 16: Get Active Session by Device → แสดง session ของ device
- [ ] Step 17: Cancel Session → `status: CANCELLED`

---

## 🔍 วิธีตรวจสอบ Variables ใน Postman

1. **ดู Collection Variables:**
   - คลิกขวาที่ Collection → **Edit**
   - ไปที่ tab **Variables**
   - ดูค่าทั้งหมด: `admin_token`, `user_id`, `device_id`, `device2_id`, `session_id`

2. **ดู Test Results:**
   - หลังรัน request ดูที่ tab **Test Results**
   - ควรเห็นข้อความ: "Admin token saved:", "User ID saved:", etc.

---

## 💡 Tips

1. **รันตามลำดับ:** ต้องรันตามลำดับ Step เพราะแต่ละ Step ใช้ Variables จาก Step ก่อนหน้า
2. **ตรวจสอบ Variables:** ถ้า request ไม่ได้ ให้ตรวจสอบว่า Variables ถูกบันทึกหรือไม่
3. **Token Expiry:** ถ้า token หมดอายุ ให้ Login ใหม่ (Step 1)
4. **Console Logs:** เปิด Postman Console (View → Show Postman Console) เพื่อดู logs

---

## 🐛 Troubleshooting

### Token ไม่ถูกบันทึก

- ตรวจสอบว่า Login request สำเร็จ (status 200)
- ดู Test Results tab ว่ามี error หรือไม่
- ดู Console logs

### Variables ไม่ถูกบันทึก

- ตรวจสอบว่า request สำเร็จ (status 200/201)
- ตรวจสอบ response structure ตรงกับที่คาดหวัง
- ดู Test Results tab

### Request Failed (401 Unauthorized)

- ตรวจสอบว่า `admin_token` ถูกบันทึก
- Login ใหม่ (Step 1)

### Request Failed (404 Not Found)

- ตรวจสอบว่า backend server ทำงานอยู่
- ตรวจสอบ `base_url` ถูกต้อง (`http://localhost:3001`)

---

## 📚 API Endpoints ที่ใช้ในการทดสอบ

### Auth

- `POST /auth/login` - Login เป็น Admin

### Users

- `POST /users` - สร้าง User
- `POST /users/:id/connect-device` - เชื่อม User กับ Device

### Devices

- `POST /devices` - สร้าง Device

### Sessions

- `POST /sessions` - สร้าง Session
- `GET /sessions/:id` - ดึง Session จาก ID
- `GET /sessions/:id/remaining` - ดูเวลาที่เหลือ
- `POST /sessions/:id/pause` - หยุด Session
- `POST /sessions/:id/move` - ย้าย Session ไปเครื่องอื่น
- `GET /sessions/:id/move-logs` - ดึง Move Logs
- `GET /sessions` - ดึง Sessions ทั้งหมด
- `GET /sessions/user/:userId` - ดึง Session ที่ active ของ User
- `GET /sessions/device/:deviceId` - ดึง Session ที่ active ของ Device
- `POST /sessions/:id/resume` - เริ่ม Session ต่อ
- `POST /sessions/:id/cancel` - ยกเลิก Session

---

## ✅ พร้อมทดสอบแล้ว!

เริ่มจาก **Step 1: Login** แล้วทำตามลำดับทีละขั้นตอน

**Happy Testing! 🚀**
