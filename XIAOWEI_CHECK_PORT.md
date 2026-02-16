# วิธีตรวจสอบว่า Xiaowei HTTP API รันที่ port ไหน

## 📋 วิธีตรวจสอบ

### วิธีที่ 1: ดู port ที่กำลัง listen (แนะนำ)

**Windows:**
```powershell
# ดู port ทั้งหมดที่กำลัง listen
netstat -ano | findstr LISTENING

# ดูเฉพาะ port ที่เป็นไปได้ (8080, 8888, 3000, 8081, 22222)
netstat -ano | findstr LISTENING | findstr -E ":(8080|8888|3000|8081|22222|8082|9090)"

# ดูเฉพาะ localhost (127.0.0.1)
netstat -ano | findstr LISTENING | findstr "127.0.0.1"
```

**Linux/Mac:**
```bash
# ดู port ทั้งหมดที่กำลัง listen
netstat -tuln | grep LISTEN

# หรือใช้ lsof
lsof -i -P -n | grep LISTEN
```

---

### วิธีที่ 2: ทดสอบ port ต่างๆ ที่เป็นไปได้

**ทดสอบด้วย curl:**
```powershell
# ทดสอบ port 8080 (default)
curl http://localhost:8080/api/devices

# ทดสอบ port อื่นๆ
curl http://localhost:8888/api/devices
curl http://localhost:3000/api/devices
curl http://localhost:8081/api/devices
curl http://localhost:8082/api/devices
curl http://localhost:9090/api/devices
```

**ผลลัพธ์:**
- ✅ **ได้ JSON response** = HTTP API Server เปิดอยู่ที่ port นี้
- ❌ **Connection refused** = HTTP API Server ยังไม่เปิด (หรือไม่มี)
- ❌ **HTTP 404** = มี service แต่ไม่ใช่เสี่ยวเหว๋ย API

---

### วิธีที่ 3: ดูในเสี่ยวเหว๋ย application

**1. ดูที่ Settings:**
- เปิดเสี่ยวเหว๋ย Application
- ไปที่ Settings → หา "API Server" หรือ "HTTP API"
- ดู port ที่แสดงอยู่ (อาจเป็น 8080, 8888, หรือ port อื่น)

**2. ดูที่ Status Bar:**
- ดูที่ Status Bar หรือ Bottom Bar
- อาจมีแสดง port หรือ API status

**3. ดูที่ Logs:**
- เปิด Logs หรือ Console ในเสี่ยวเหว๋ย
- อาจมีแสดง port ที่ HTTP API Server รันอยู่

**4. ดูที่ About/Info:**
- เปิด About หรือ Info ในเสี่ยวเหว๋ย
- อาจมีแสดง port หรือ API information

---

### วิธีที่ 4: ดูใน config files

**1. ดูใน backend/.env:**
```env
XIAOWEI_API_URL=http://localhost:8080
```

**หมายเหตุ:** 
- ค่านี้เป็นค่า default ที่ backend ใช้
- อาจไม่ตรงกับ port ที่เสี่ยวเหว๋ยรันจริง
- ต้องตรวจสอบว่าเสี่ยวเหว๋ยรันที่ port ไหนจริงๆ

**2. ดูในเสี่ยวเหว๋ย config files (ถ้ามี):**
- ดูที่ config directory ของเสี่ยวเหว๋ย
- อาจมี config file ที่ระบุ port

---

## 🔍 ผลการทดสอบปัจจุบัน

จากการทดสอบ:
- **Port 8080:** Connection refused ❌ (ไม่มี HTTP API Server)
- **Port 8888:** HTTP 404 ❌ (มี service แต่ไม่ใช่เสี่ยวเหว๋ย API)
- **Port 3000:** HTTP 404 ❌ (มี service แต่ไม่ใช่เสี่ยวเหว๋ย API)
- **Port อื่นๆ:** Connection refused ❌

**สรุป:** เสี่ยวเหว๋ย HTTP API Server **ยังไม่เปิดอยู่** หรือ **ไม่มี HTTP API Server**

---

## 💡 ความเป็นไปได้

### 1. เสี่ยวเหว๋ยไม่มี HTTP API Server

**เสี่ยวเหว๋ยอาจมีแค่ WebSocket API เท่านั้น:**
- WebSocket: `ws://127.0.0.1:22222/` ✅ (มี)
- HTTP API: `http://localhost:8080/api/devices` ❌ (ไม่มี)

### 2. HTTP API Server ยังไม่เปิด

**HTTP API Server อาจต้องเปิดใน Settings:**
- เปิดเสี่ยวเหว๋ย Application
- ไปที่ Settings → เปิด "API Server" หรือ "HTTP API"
- ตั้งค่า Port (default: 8080)
- Restart เสี่ยวเหว๋ย

### 3. HTTP API Server รันที่ port อื่น

**HTTP API Server อาจรันที่ port ที่ไม่ใช่ 8080:**
- ตรวจสอบ port ทั้งหมดที่กำลัง listen
- ทดสอบ port ต่างๆ ที่เป็นไปได้
- ดูใน Settings ของเสี่ยวเหว๋ย

---

## ✅ ขั้นตอนแนะนำ

### Step 1: ตรวจสอบ port ที่กำลัง listen

```powershell
netstat -ano | findstr LISTENING | findstr "127.0.0.1"
```

**ดูผลลัพธ์:**
- หา port ที่เป็นไปได้ (8080, 8888, 3000, 8081, 22222, etc.)
- ดูว่า port ไหนที่อาจเป็นเสี่ยวเหว๋ย HTTP API Server

### Step 2: ทดสอบ port ต่างๆ

```powershell
curl http://localhost:8080/api/devices
curl http://localhost:8888/api/devices
curl http://localhost:3000/api/devices
```

**ดูผลลัพธ์:**
- ถ้าได้ JSON response = HTTP API Server เปิดอยู่ที่ port นี้ ✅
- ถ้าได้ Connection refused = HTTP API Server ยังไม่เปิด ❌

### Step 3: ดูในเสี่ยวเหว๋ย application

1. เปิดเสี่ยวเหว๋ย Application
2. ไปที่ Settings → หา "API Server" หรือ "HTTP API"
3. ดู port ที่แสดงอยู่
4. ตรวจสอบว่า API Server status เป็น "Running" หรือ "Active"

### Step 4: อัปเดต backend/.env

ถ้าพบว่าเสี่ยวเหว๋ยรันที่ port อื่น:

```env
# ตัวอย่าง: ถ้าเสี่ยวเหว๋ยรันที่ port 8888
XIAOWEI_API_URL=http://localhost:8888
```

**⚠️ สำคัญ:** หลังจากแก้ไข `.env` ต้อง **restart Backend**

---

## 🔗 ลิงก์ที่เกี่ยวข้อง

- เสี่ยวเหว๋ย Website: https://www.xiaowei.xin/
- เอกสาร API: https://www.xiaowei.xin/help/70/349
- WebSocket Testing Tool: https://wstool.js.org/

---

## ❓ ถ้ายังหาไม่เจอ?

1. **ตรวจสอบว่าเสี่ยวเหว๋ยเปิดอยู่หรือไม่**
   - เปิด Task Manager (Ctrl+Shift+Esc)
   - ดูว่ามี process "Xiaowei" หรือ "效卫" รันอยู่หรือไม่

2. **ตรวจสอบว่า HTTP API Server เปิดอยู่หรือไม่**
   - ดูใน Settings ของเสี่ยวเหว๋ย
   - ดูที่ Status Bar หรือ Logs

3. **ทดสอบ WebSocket แทน**
   - เสี่ยวเหว๋ยอาจมีแค่ WebSocket API (ไม่มี HTTP API)
   - ทดสอบ WebSocket: `ws://127.0.0.1:22222/`

4. **ติดต่อเสี่ยวเหว๋ย Support**
   - สอบถามเรื่อง HTTP API Server
   - สอบถามว่า HTTP API Server มีหรือไม่
   - สอบถามว่า HTTP API Server ต้องเปิดอย่างไร
