# API Testing Guide

## Prerequisites

1. **Start Backend Server**

   ```bash
   cd backend
   npm run start:dev
   ```

2. **Environment Variables** (ใน `.env`)

   ```env
   MONGO_URI=mongodb://localhost:27017/boxphon
   JWT_SECRET=your-secret-key
   JWT_EXPIRATION=1d
   PORT=3001
   SESSION_MAX_MOVE_COUNT=2
   SESSION_DEFAULT_DISCONNECT_REASON=Device disconnected
   ```

3. **Get Admin Token**
   - Login เป็น Admin ก่อนเพื่อได้ JWT token
   - ใช้ token นี้ใน header ทุก request

---

## Step 1: Login เป็น Admin

```bash
POST http://localhost:3001/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**

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

**บันทึก `access_token` ไว้ใช้ใน request ถัดไป**

---

## Step 2: สร้าง User (ถ้ายังไม่มี)

```bash
POST http://localhost:3001/users
Authorization: Bearer {YOUR_ADMIN_TOKEN}
Content-Type: application/json

{
  "username": "testuser1",
  "password": "password123",
  "role": "USER",
  "package": "BASIC"
}
```

**บันทึก `user_id` จาก response**

---

## Step 3: สร้าง Device (ถ้ายังไม่มี)

```bash
POST http://localhost:3001/devices
Authorization: Bearer {YOUR_ADMIN_TOKEN}
Content-Type: application/json

{
  "name": "Device 1",
  "serial_number": "DEVICE001",
  "model": "Test Model",
  "status": "AVAILABLE"
}
```

**บันทึก `device_id` จาก response**

---

## Step 4: สร้าง Session (เมื่อลูกค้าจ่ายเงิน)

```bash
POST http://localhost:3001/sessions
Authorization: Bearer {YOUR_ADMIN_TOKEN}
Content-Type: application/json

{
  "user_id": "{USER_ID_FROM_STEP_2}",
  "device_id": "{DEVICE_ID_FROM_STEP_3}",
  "package": "BASIC",
  "total_seconds": 7200
}
```

**Response:**

```json
{
  "message": "Session created successfully",
  "session": {
    "id": "SESSION_ID",
    "user_id": "...",
    "device_id": "...",
    "package": "BASIC",
    "total_seconds": 7200,
    "remaining_seconds": 7200,
    "status": "ACTIVE",
    "start_time": "2024-01-01T10:00:00.000Z"
  }
}
```

**บันทึก `SESSION_ID` ไว้**

---

## Step 5: ดูเวลาที่เหลือ

```bash
GET http://localhost:3001/sessions/{SESSION_ID}/remaining
Authorization: Bearer {YOUR_ADMIN_TOKEN}
```

**Response:**

```json
{
  "session_id": "...",
  "remaining_seconds": 7150,
  "remaining_minutes": 119,
  "remaining_hours": 1,
  "formatted": "01:59:10"
}
```

---

## Step 6: Pause Session (จำลองเครื่องหลุด)

```bash
POST http://localhost:3001/sessions/{SESSION_ID}/pause
Authorization: Bearer {YOUR_ADMIN_TOKEN}
Content-Type: application/json

{
  "reason": "Device disconnected - testing"
}
```

**Response:**

```json
{
  "message": "Session paused successfully",
  "session": {
    "id": "...",
    "status": "DISCONNECTED",
    "remaining_seconds": 7100,
    "pause_time": "2024-01-01T10:05:00.000Z"
  }
}
```

**สังเกต:** `remaining_seconds` ถูก freeze ไว้แล้ว ไม่ลดลงต่อ

---

## Step 7: ดู Session Details

```bash
GET http://localhost:3001/sessions/{SESSION_ID}
Authorization: Bearer {YOUR_ADMIN_TOKEN}
```

**Response:**

```json
{
  "_id": "...",
  "user_id": {...},
  "device_id": {...},
  "package": "BASIC",
  "total_seconds": 7200,
  "remaining_seconds": 7100,
  "status": "DISCONNECTED",
  "start_time": "2024-01-01T10:00:00.000Z",
  "pause_time": "2024-01-01T10:05:00.000Z",
  "moved_count": 0
}
```

---

## Step 8: สร้าง Device ใหม่ (สำหรับย้าย session)

```bash
POST http://localhost:3001/devices
Authorization: Bearer {YOUR_ADMIN_TOKEN}
Content-Type: application/json

{
  "name": "Device 2",
  "serial_number": "DEVICE002",
  "model": "Test Model 2",
  "status": "AVAILABLE"
}
```

**บันทึก `NEW_DEVICE_ID`**

---

## Step 9: Move Session (ย้ายไปเครื่องอื่น)

```bash
POST http://localhost:3001/sessions/{SESSION_ID}/move
Authorization: Bearer {YOUR_ADMIN_TOKEN}
Content-Type: application/json

{
  "to_device_id": "{NEW_DEVICE_ID}",
  "reason": "Device 1 broken, moving to Device 2"
}
```

**Response:**

```json
{
  "message": "Session moved successfully",
  "session": {
    "id": "...",
    "device_id": "{NEW_DEVICE_ID}",
    "remaining_seconds": 7100,
    "status": "ACTIVE",
    "moved_count": 1,
    "resume_time": "2024-01-01T10:10:00.000Z"
  }
}
```

**สังเกต:**

- `remaining_seconds` ยังคงเป็น 7100 (ไม่เสียเวลา)
- `status` เปลี่ยนเป็น `ACTIVE` (พร้อมใช้งาน)
- `moved_count` เพิ่มเป็น 1

---

## Step 10: ดู Move Logs

```bash
GET http://localhost:3001/sessions/{SESSION_ID}/move-logs
Authorization: Bearer {YOUR_ADMIN_TOKEN}
```

**Response:**

```json
[
  {
    "_id": "...",
    "session_id": "...",
    "from_device_id": {...},
    "to_device_id": {...},
    "remaining_seconds": 7100,
    "moved_by": {...},
    "reason": "Device 1 broken, moving to Device 2",
    "createdAt": "2024-01-01T10:10:00.000Z"
  }
]
```

---

## Step 11: Resume Session (ถ้าต้องการ)

```bash
POST http://localhost:3001/sessions/{SESSION_ID}/resume
Authorization: Bearer {YOUR_ADMIN_TOKEN}
```

**Response:**

```json
{
  "message": "Session resumed successfully",
  "session": {
    "id": "...",
    "status": "ACTIVE",
    "remaining_seconds": 7100,
    "resume_time": "2024-01-01T10:15:00.000Z"
  }
}
```

---

## Step 12: ดู Session ของ User

```bash
GET http://localhost:3001/sessions/user/{USER_ID}
Authorization: Bearer {YOUR_ADMIN_TOKEN}
```

---

## Step 13: ดู Session ของ Device

```bash
GET http://localhost:3001/sessions/device/{DEVICE_ID}
Authorization: Bearer {YOUR_ADMIN_TOKEN}
```

---

## Step 14: ดึง Session ทั้งหมด

```bash
GET http://localhost:3001/sessions
Authorization: Bearer {YOUR_ADMIN_TOKEN}
```

---

## Step 15: Cancel Session

```bash
POST http://localhost:3001/sessions/{SESSION_ID}/cancel
Authorization: Bearer {YOUR_ADMIN_TOKEN}
```

---

## Testing Scenarios

### Scenario 1: Move Session หลายครั้ง (ทดสอบ limit)

1. Pause session
2. Move session ครั้งที่ 1 → `moved_count = 1`
3. Pause session อีกครั้ง
4. Move session ครั้งที่ 2 → `moved_count = 2`
5. Pause session อีกครั้ง
6. Move session ครั้งที่ 3 → **ควร error** (เกิน limit)

### Scenario 2: ย้าย Session ไป Device ที่มีคนใช้อยู่

1. สร้าง Session 1 บน Device A
2. สร้าง Session 2 บน Device B
3. Pause Session 1
4. พยายาม Move Session 1 ไป Device B → **ควร error** (Device B ถูกใช้อยู่)

### Scenario 3: เวลาไม่หายเมื่อ Move

1. สร้าง Session (7200 seconds)
2. รอ 100 seconds
3. Pause Session → `remaining_seconds` ควรเป็น ~7100
4. รออีก 200 seconds (session ยัง pause อยู่)
5. Move Session → `remaining_seconds` ควรยังเป็น ~7100 (ไม่เสียเวลา)

---

## ใช้ Postman Collection

สร้าง Postman Collection โดย:

1. Import collection จากไฟล์นี้
2. ตั้งค่า Environment Variables:
   - `base_url`: `http://localhost:3001`
   - `admin_token`: (ใส่ token หลัง login)
   - `user_id`: (ใส่ user_id หลังสร้าง user)
   - `device_id`: (ใส่ device_id หลังสร้าง device)
   - `session_id`: (ใส่ session_id หลังสร้าง session)

---

## ใช้ cURL

### Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Create Session

```bash
curl -X POST http://localhost:3001/sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "USER_ID",
    "device_id": "DEVICE_ID",
    "package": "BASIC",
    "total_seconds": 7200
  }'
```

### Move Session

```bash
curl -X POST http://localhost:3001/sessions/SESSION_ID/move \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to_device_id": "NEW_DEVICE_ID",
    "reason": "Device broken"
  }'
```

---

## Checklist การเทส

- [ ] สร้าง Session สำเร็จ
- [ ] Pause Session สำเร็จ (remaining_seconds freeze)
- [ ] Move Session สำเร็จ (remaining_seconds ไม่เปลี่ยน)
- [ ] Resume Session สำเร็จ
- [ ] Move Logs ถูกบันทึก
- [ ] ย้ายเกิน limit → Error
- [ ] ย้ายไป Device ที่ถูกใช้ → Error
- [ ] เวลาไม่หายเมื่อ Move
- [ ] Gateway auto-pause เมื่อ device disconnect
