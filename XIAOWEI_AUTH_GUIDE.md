# คู่มือการตั้งค่า Authentication สำหรับเสี่ยวเหว๋ย

## ❓ ต้องใช้ API Key / Username / Password หรือไม่?

**คำตอบ: ไม่จำเป็นเสมอไป** ขึ้นอยู่กับการตั้งค่าของเสี่ยวเหว๋ย

---

## 🔍 วิธีตรวจสอบว่าเสี่ยวเหว๋ยต้องการ Authentication หรือไม่

### วิธีที่ 1: ทดสอบเรียก API โดยไม่ใส่ Authentication

ลองเรียก API โดยตรง:

```bash
# ทดสอบ health check หรือ list devices
curl http://localhost:8080/api/health
# หรือ
curl http://localhost:8080/api/devices
```

**ผลลัพธ์:**
- ✅ **200 OK** = ไม่ต้องการ authentication → ไม่ต้องตั้งค่า API Key/Username/Password
- ❌ **401 Unauthorized** = ต้องการ authentication → ต้องตั้งค่า
- ❌ **403 Forbidden** = ต้องการ authentication → ต้องตั้งค่า

### วิธีที่ 2: ดูจากเอกสารเสี่ยวเหว๋ย

ดูเอกสาร: https://www.xiaowei.xin/help/70/349

---

## 📝 วิธีหาค่า API Key / Username / Password

### 1. API Key

**หาจาก:**
- เอกสารเสี่ยวเหว๋ย
- หน้า Settings/Configuration ในเสี่ยวเหว๋ย
- ไฟล์ config ของเสี่ยวเหว๋ย
- ถ้าไม่มี → ไม่ต้องใช้

**ตัวอย่าง:**
```env
XIAOWEI_API_KEY=abc123xyz789
```

### 2. Username / Password

**หาจาก:**
- ข้อมูล login ที่ใช้เข้าเสี่ยวเหว๋ย
- ถ้าเสี่ยวเหว๋ยไม่ต้องการ login → ไม่ต้องใช้

**ตัวอย่าง:**
```env
XIAOWEI_USERNAME=admin
XIAOWEI_PASSWORD=password123
```

---

## ⚙️ วิธีตั้งค่า

### กรณีที่ 1: ไม่ต้องการ Authentication

**แก้ไข `backend/.env`:**
```env
XIAOWEI_API_URL=http://localhost:8080
# ไม่ต้องใส่ API Key, Username, Password
```

หรือลบออก:
```env
XIAOWEI_API_URL=http://localhost:8080
```

### กรณีที่ 2: ต้องการ API Key เท่านั้น

**แก้ไข `backend/.env`:**
```env
XIAOWEI_API_URL=http://localhost:8080
XIAOWEI_API_KEY=your_real_api_key_here
# ไม่ต้องใส่ Username, Password
```

### กรณีที่ 3: ต้องการ Username/Password

**แก้ไข `backend/.env`:**
```env
XIAOWEI_API_URL=http://localhost:8080
XIAOWEI_USERNAME=your_username
XIAOWEI_PASSWORD=your_password
# ไม่ต้องใส่ API Key
```

### กรณีที่ 4: ต้องการทั้ง API Key และ Username/Password

**แก้ไข `backend/.env`:**
```env
XIAOWEI_API_URL=http://localhost:8080
XIAOWEI_API_KEY=your_api_key
XIAOWEI_USERNAME=your_username
XIAOWEI_PASSWORD=your_password
```

---

## 🧪 ทดสอบการตั้งค่า

### 1. Restart Backend

```bash
cd backend
npm run start:dev
```

### 2. ดู Logs

**ถ้าตั้งค่าถูกต้อง:**
```
[XiaoweiService] Xiaowei Service initialized - API URL: http://localhost:8080 (with API Key)
```

**ถ้าไม่ใส่ API Key:**
```
[XiaoweiService] Xiaowei Service initialized - API URL: http://localhost:8080 (no authentication)
⚠️  XIAOWEI_API_KEY not set - API calls will be made without authentication
```

### 3. ทดสอบดึงหน้าจอ

เปิด Admin Panel และดูว่าสามารถดึงหน้าจอได้หรือไม่

---

## ❌ ถ้ายังดึงหน้าจอไม่ได้

### ตรวจสอบ:

1. **Backend Logs** - ดู error message
2. **Browser Console** - ดู error ใน Network tab
3. **เสี่ยวเหว๋ย API** - ตรวจสอบว่า API server รันอยู่หรือไม่
4. **API Endpoint** - ตรวจสอบว่า endpoint ถูกต้องหรือไม่

### ปัญหาที่พบบ่อย:

- **401 Unauthorized** → ต้องตั้งค่า API Key/Username/Password
- **404 Not Found** → API endpoint ไม่ถูกต้อง
- **Connection Refused** → เสี่ยวเหว๋ย API ไม่ได้รัน หรือ URL ผิด

---

## 📞 ต้องการความช่วยเหลือ?

1. ดูเอกสารเสี่ยวเหว๋ย: https://www.xiaowei.xin/help/70/349
2. ตรวจสอบ Backend logs
3. ทดสอบเรียก API โดยตรงด้วย curl
