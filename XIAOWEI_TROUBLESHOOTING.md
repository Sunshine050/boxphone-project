# คู่มือแก้ไขปัญหาเสี่ยวเหว๋ย API

## ❌ ปัญหา: Unable to connect to the remote server

### สาเหตุ
เสี่ยวเหว๋ย API server **ไม่ได้รันอยู่** หรือรันอยู่ที่ port อื่น

---

## 🔍 วิธีตรวจสอบ

### 1. ตรวจสอบว่าเสี่ยวเหว๋ยรันอยู่หรือไม่

**Windows (PowerShell):**
```powershell
netstat -ano | findstr :8080
```

**Windows (CMD):**
```cmd
netstat -ano | findstr :8080
```

**ผลลัพธ์:**
- **มี output** = มี service รันอยู่ที่ port 8080
- **ไม่มี output** = ไม่มี service รันอยู่ที่ port 8080

### 2. ตรวจสอบว่าเสี่ยวเหว๋ยรันอยู่ที่ port ไหน

```powershell
# ดูทุก port ที่กำลัง listen
netstat -ano | findstr LISTENING
```

---

## ✅ วิธีแก้ไข

### วิธีที่ 1: เริ่มเสี่ยวเหว๋ย API Server

1. **เปิดเสี่ยวเหว๋ย Application**
   - เปิดโปรแกรมเสี่ยวเหว๋ย (Xiaowei) ที่ติดตั้งไว้
   - ตรวจสอบว่าเสี่ยวเหว๋ยเปิดอยู่

2. **ตรวจสอบว่าเสี่ยวเหว๋ยเปิด API Server หรือไม่**
   - ดูใน Settings/Configuration ของเสี่ยวเหว๋ย
   - ตรวจสอบว่า "API Server" หรือ "HTTP API" เปิดอยู่

3. **ตรวจสอบ Port ที่เสี่ยวเหว๋ยใช้**
   - ดูใน Settings → API Port
   - อาจจะเป็น 8080, 8888, หรือ port อื่น

### วิธีที่ 2: แก้ไข XIAOWEI_API_URL

ถ้าเสี่ยวเหว๋ยรันอยู่ที่ port อื่น ให้แก้ไข `backend/.env`:

```env
# ตัวอย่าง: ถ้าเสี่ยวเหว๋ยรันที่ port 8888
XIAOWEI_API_URL=http://localhost:8888

# ตัวอย่าง: ถ้าเสี่ยวเหว๋ยรันบนเครื่องอื่น
XIAOWEI_API_URL=http://192.168.1.100:8080
```

**⚠️ สำคัญ:** หลังจากแก้ไข `.env` ต้อง **restart Backend**

### วิธีที่ 3: ตรวจสอบว่าเสี่ยวเหว๋ยติดตั้งถูกต้องหรือไม่

1. **ตรวจสอบว่าเสี่ยวเหว๋ยติดตั้งแล้วหรือยัง**
   - ดาวน์โหลดจาก: https://www.xiaowei.xin/
   - ติดตั้งเสี่ยวเหว๋ย

2. **ตรวจสอบว่าเสี่ยวเหว๋ยเปิดอยู่**
   - เปิด Task Manager (Ctrl+Shift+Esc)
   - ดูว่ามี process "Xiaowei" หรือ "效卫" รันอยู่หรือไม่

---

## 🧪 ทดสอบการเชื่อมต่อ

### 1. ทดสอบด้วย curl

```powershell
# ทดสอบ port 8080
curl http://localhost:8080/api/devices

# ทดสอบ port อื่นๆ ที่เป็นไปได้
curl http://localhost:8888/api/devices
curl http://localhost:3000/api/devices
```

### 2. ทดสอบด้วย Browser

เปิดเบราว์เซอร์ไปที่:
- http://localhost:8080
- http://localhost:8080/api/devices
- http://localhost:8080/api/health

---

## 📝 ขั้นตอนการตั้งค่าเสี่ยวเหว๋ย

### 1. ดาวน์โหลดและติดตั้งเสี่ยวเหว๋ย

1. ไปที่: https://www.xiaowei.xin/
2. ดาวน์โหลด "效卫安卓投屏" (Xiaowei Android Screen Mirroring)
3. ติดตั้งเสี่ยวเหว๋ย

### 2. เปิดเสี่ยวเหว๋ยและตั้งค่า API

1. เปิดเสี่ยวเหว๋ย Application
2. ไปที่ Settings/Configuration
3. เปิด "API Server" หรือ "HTTP API"
4. ตั้งค่า Port (default: 8080)
5. บันทึกการตั้งค่า

### 3. ตรวจสอบว่า API เปิดอยู่

1. ดูในเสี่ยวเหว๋ยว่า API Server status เป็น "Running" หรือ "Active"
2. ทดสอบด้วย curl หรือ browser

### 4. ตั้งค่า Backend

แก้ไข `backend/.env`:
```env
XIAOWEI_API_URL=http://localhost:8080
```

### 5. Restart Backend

```bash
cd backend
npm run start:dev
```

---

## 🔧 ปัญหาที่พบบ่อย

### ปัญหา 1: เสี่ยวเหว๋ยไม่เปิด API Server

**แก้ไข:**
- เปิดเสี่ยวเหว๋ย
- ไปที่ Settings → เปิด "API Server"
- Restart เสี่ยวเหว๋ย

### ปัญหา 2: Port ถูกใช้โดย service อื่น

**แก้ไข:**
- เปลี่ยน port ในเสี่ยวเหว๋ย Settings
- แก้ไข `XIAOWEI_API_URL` ใน `.env` ให้ตรงกับ port ใหม่

### ปัญหา 3: Firewall block

**แก้ไข:**
- เปิด Windows Firewall
- อนุญาตเสี่ยวเหว๋ยผ่าน firewall
- หรือปิด firewall ชั่วคราวเพื่อทดสอบ

---

## 📞 ต้องการความช่วยเหลือเพิ่มเติม?

1. ตรวจสอบว่าเสี่ยวเหว๋ยติดตั้งและเปิดอยู่
2. ตรวจสอบ port ที่เสี่ยวเหว๋ยใช้
3. ดู Backend logs เพื่อดู error message
4. ทดสอบด้วย curl หรือ browser
