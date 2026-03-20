# คู่มือการตั้งค่าเสี่ยวเหว๋ย (Xiaowei) สำหรับดึงหน้าจอ

## 📋 สารบัญ
1. [ภาพรวม](#ภาพรวม)
2. [การตั้งค่า Environment Variables](#การตั้งค่า-environment-variables)
3. [การใช้งาน](#การใช้งาน)
4. [API Endpoints](#api-endpoints)
5. [การแก้ไขปัญหา](#การแก้ไขปัญหา)

---

## 🎯 ภาพรวม

ระบบนี้ใช้ **เสี่ยวเหว๋ย (Xiaowei)** สำหรับดึงหน้าจอจาก BoxPhone Server และแสดงใน Admin Panel

### เอกสารอ้างอิง
- เอกสารเสี่ยวเหว๋ย: https://www.xiaowei.xin/help/70/349

---

## ⚙️ การตั้งค่า Environment Variables

### Backend (`.env` ใน `backend/`)

เพิ่ม environment variables ต่อไปนี้:

```env
# Xiaowei (เสี่ยวเหว๋ย) API Configuration
# เอกสาร: https://www.xiaowei.xin/help/70/349
XIAOWEI_API_URL=http://localhost:8080
XIAOWEI_API_KEY=your_api_key
XIAOWEI_USERNAME=your_username
XIAOWEI_PASSWORD=your_password
```

**หมายเหตุ:**
- `XIAOWEI_API_URL`: URL ของเสี่ยวเหว๋ย API server (ปรับตามที่ติดตั้ง)
  - ถ้าเสี่ยวเหว๋ยรันบนเครื่องเดียวกัน: `http://localhost:8080`
  - ถ้าเสี่ยวเหว๋ยรันบนเครื่องอื่น: `http://IP_ADDRESS:PORT`
- `XIAOWEI_API_KEY`: API Key สำหรับ authentication (ถ้ามี)
  - ดูจากเอกสารเสี่ยวเหว๋ยหรือตั้งค่าในเสี่ยวเหว๋ย
- `XIAOWEI_USERNAME`: Username สำหรับ login (ถ้ามี)
- `XIAOWEI_PASSWORD`: Password สำหรับ login (ถ้ามี)

**⚠️ สำคัญ:** ต้องแก้ไขค่าจริงๆ ในไฟล์ `.env`:
1. เปิดไฟล์ `backend/.env`
2. แก้ไข `XIAOWEI_API_URL` ให้ตรงกับ URL ของเสี่ยวเหว๋ยที่ติดตั้ง
3. แก้ไข `XIAOWEI_API_KEY` ให้เป็น API Key จริง (ถ้ามี)
4. แก้ไข `XIAOWEI_USERNAME` และ `XIAOWEI_PASSWORD` (ถ้ามี)
5. **Restart Backend** เพื่อให้ environment variables มีผล

### Frontend (`.env.local` ใน `admin/`)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3031
# หรือ
NEXT_PUBLIC_BACKEND_URL=http://localhost:3031
```

---

## 🚀 การใช้งาน

### 1. เริ่มต้น Backend

```bash
cd backend
npm run start:dev
```

### 2. เริ่มต้น Admin Panel

```bash
cd admin
npm run dev
```

### 3. เปิด Admin Panel

เปิดเบราว์เซอร์ไปที่: `http://localhost:3000/admin`

### 4. ดูหน้าจอ

- **หน้าภาพรวมระบบ**: แสดงภาพหน้าจอของทุกเครื่อง
- **หน้าอุปกรณ์ที่พร้อมใช้งาน**: แสดงภาพหน้าจอของเครื่องที่พร้อมใช้งาน

---

## 📡 API Endpoints

### 1. ดึงหน้าจอตาม Device ID

```
GET /devices/:id/screenshot
```

**Response:**
- Content-Type: `image/png`
- Body: PNG image buffer

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3031/devices/DEVICE_ID/screenshot
```

### 2. ดึงหน้าจอตาม Serial Number

```
GET /devices/screenshot?serial=SERIAL_NUMBER
```

**Response:**
- Content-Type: `image/png`
- Body: PNG image buffer

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3031/devices/screenshot?serial=276b135d13217ece"
```

---

## 🔧 การแก้ไขปัญหา

### ปัญหา: ไม่สามารถดึงหน้าจอได้

**สาเหตุที่เป็นไปได้:**
1. เสี่ยวเหว๋ย API ไม่ได้รัน
2. Environment variables ไม่ถูกต้อง
3. API endpoint ไม่ตรงกับเอกสารเสี่ยวเหว๋ย

**วิธีแก้ไข:**

1. **ตรวจสอบว่าเสี่ยวเหว๋ย API รันอยู่:**
   ```bash
   curl http://localhost:8080/api/health
   ```

2. **ตรวจสอบ environment variables:**
   ```bash
   # Backend
   cd backend
   cat .env | grep XIAOWEI
   ```

3. **ตรวจสอบ logs:**
   ```bash
   # Backend logs จะแสดง error message
   ```

### ปัญหา: ภาพหน้าจอไม่แสดงใน Admin Panel

**สาเหตุที่เป็นไปได้:**
1. CORS policy block
2. Authentication token ไม่ถูกต้อง
3. API endpoint ไม่ถูกต้อง

**วิธีแก้ไข:**

1. **ตรวจสอบ Network tab ใน Browser DevTools:**
   - ดูว่า request ถูกส่งไปหรือไม่
   - ดู status code และ error message

2. **ตรวจสอบ Authentication:**
   - ตรวจสอบว่า login แล้ว
   - ตรวจสอบว่า token ยังไม่หมดอายุ

3. **ตรวจสอบ CORS:**
   - ตรวจสอบว่า Backend อนุญาต CORS จาก Frontend domain

---

## 📝 หมายเหตุ

### การปรับแต่ง API Endpoints

ถ้าเสี่ยวเหว๋ย API ใช้ endpoint ที่แตกต่างจากที่กำหนดไว้ในโค้ด ให้แก้ไขไฟล์:

```
backend/src/modules/devices/xiaowei.service.ts
```

แก้ไขใน method `getScreenshot()`:

```typescript
// ตัวอย่าง: ถ้าเสี่ยวเหว๋ยใช้ endpoint นี้
response = await this.apiClient.get(`/api/v1/devices/${serialNumber}/screen`, {
  responseType: 'arraybuffer',
});
```

### Auto-refresh

- ภาพหน้าจอจะ refresh อัตโนมัติทุก **5 วินาที**
- สามารถกดปุ่ม **Refresh** เพื่อ refresh แบบ manual ได้

### Performance

- ภาพหน้าจอจะถูก cache ใน browser ชั่วคราว
- ใช้ timestamp (`?t=...`) เพื่อ bypass cache เมื่อ refresh

---

## 📞 ติดต่อ

หากมีปัญหาหรือคำถามเพิ่มเติม กรุณาติดต่อทีมพัฒนา
