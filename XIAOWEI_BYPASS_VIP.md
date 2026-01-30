# วิธีใช้เสี่ยวเหว๋ยโดยไม่ต้อง VIP (Bypass VIP)

## ❌ ปัญหา: สมัครไม่ได้ / Activate VIP ไม่ได้

แม้จะ:
- ✅ ใส่รหัสยืนยันทันทีภายใน 10 วินาที
- ✅ ใช้รหัสล่าสุดที่ส่งมา
- ✅ Copy รหัสจากอีเมลโดยตรง
- ✅ ตรวจสอบว่าไม่มี space หรือตัวอักษรพิเศษ

**แต่ยังสมัครไม่ได้ / Activate VIP ไม่ได้**

---

## ✅ วิธีแก้ไข: ใช้ HTTP API แทน WebSocket

**HTTP API อาจไม่ต้องการ VIP activation!**

### ขั้นตอนที่ 1: เปิด HTTP API Server ในเสี่ยวเหว๋ย

1. **เปิดเสี่ยวเหว๋ย Application**
2. **กดปุ่ม "API"** (ข้างข้อความ "Login to use the VIP version!")
   - หรือไปที่ Settings → หา "API Server" หรือ "HTTP API" → เปิด/Enable
3. **ตรวจสอบว่า API Server เปิดอยู่**
   - ดูว่า status เป็น "API Server: Running" หรือ "HTTP API: Active"

### ขั้นตอนที่ 2: ทดสอบ HTTP API

```powershell
# ทดสอบ device list
curl http://localhost:8080/api/devices

# ถ้าได้ JSON response = HTTP API เปิดอยู่ ✅
# ถ้า Connection refused = HTTP API ยังไม่เปิด ❌
```

### ขั้นตอนที่ 3: ตั้งค่า Backend

1. **ตรวจสอบ `backend/.env`:**
   ```env
   XIAOWEI_API_URL=http://localhost:8080
   ```

2. **Restart Backend:**
   ```bash
   cd backend
   npm run start:dev
   ```

### ขั้นตอนที่ 4: ทดสอบ Sync จากเสี่ยวเหว๋ย

1. **เปิด Admin Panel:** `http://localhost:3000/admin`
2. **กดปุ่ม "Sync จากเสี่ยวเหว๋ย"**
3. **ระบบจะ fallback ไปใช้ HTTP API อัตโนมัติ** (ถ้า WebSocket ไม่ได้)

---

## 🔍 ตรวจสอบว่า HTTP API เปิดอยู่หรือไม่

### วิธีที่ 1: ทดสอบด้วย curl

```powershell
curl http://localhost:8080/api/devices
```

**ผลลัพธ์:**
- ✅ **ได้ JSON response** = HTTP API เปิดอยู่
- ❌ **Connection refused** = HTTP API ยังไม่เปิด

### วิธีที่ 2: ทดสอบด้วย Browser

เปิดเบราว์เซอร์ไปที่:
- `http://localhost:8080/api/devices`
- `http://localhost:8080/api/health`

**ผลลัพธ์:**
- ✅ **แสดง JSON หรือข้อมูล** = HTTP API เปิดอยู่
- ❌ **Connection refused** = HTTP API ยังไม่เปิด

### วิธีที่ 3: ดูใน Backend Logs

เมื่อเรียกใช้ Sync จากเสี่ยวเหว๋ย:
- **ถ้าใช้ HTTP API:** จะเห็น log `[SYNC] Fetched X devices via HTTP`
- **ถ้าใช้ WebSocket:** จะเห็น log `[SYNC] Fetched X devices via WebSocket`

---

## 💡 ทำไม HTTP API อาจไม่ต้องการ VIP?

- **WebSocket API** = ต้องการ VIP (error: "请激活会员后使用")
- **HTTP API** = อาจไม่ต้องการ VIP (ขึ้นอยู่กับการตั้งค่าเสี่ยวเหว๋ย)

**ระบบจะ fallback อัตโนมัติ:**
1. ลอง WebSocket ก่อน
2. ถ้า WebSocket ไม่ได้ (error 10001) → ลอง HTTP API
3. ถ้า HTTP API ได้ → ใช้ HTTP API

---

## 📝 ขั้นตอนสรุป

1. ✅ **เปิดเสี่ยวเหว๋ย Application**
2. ✅ **กดปุ่ม "API" เพื่อเปิด HTTP API Server**
3. ✅ **ตรวจสอบว่า API Server เปิดอยู่** (ทดสอบด้วย curl)
4. ✅ **ตั้งค่า `XIAOWEI_API_URL` ใน `backend/.env`** (ถ้ายังไม่ได้ตั้ง)
5. ✅ **Restart Backend**
6. ✅ **ทดสอบ Sync จากเสี่ยวเหว๋ยใน Admin Panel**

---

## 🔗 ลิงก์ที่เกี่ยวข้อง

- เสี่ยวเหว๋ย Website: https://www.xiaowei.xin/
- เอกสาร API: https://www.xiaowei.xin/help/70/349

---

## ❓ ถ้ายังไม่ได้?

1. **ตรวจสอบว่าเสี่ยวเหว๋ยติดตั้งและเปิดอยู่**
2. **ตรวจสอบว่า HTTP API Server เปิดอยู่** (port 8080)
3. **ตรวจสอบ Firewall** - อาจ block การเชื่อมต่อ
4. **ลองเปลี่ยน port** - เสี่ยวเหว๋ยอาจใช้ port อื่น
5. **ติดต่อเสี่ยวเหว๋ย Support** เพื่อสอบถามเรื่อง:
   - วิธีใช้ API โดยไม่ต้อง VIP
   - วิธีเปิด HTTP API Server
   - API Key หรือ Token ที่ใช้ได้เลย
