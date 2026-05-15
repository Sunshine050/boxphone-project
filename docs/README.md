# Remote Control Android System

## Pre-requisites (สิ่งที่ต้องมี)
1. **Node.js**: v18+
2. **Docker Desktop**: ต้องติดตั้งและ **เปิดโปรแกรมทิ้งไว้** เสมอ
3. **Android Studio**: สำหรับรัน Mobile Agent

## โครงสร้างระบบ (Modular)

- **[docs/CLIENT-DELIVERY-HANDBOOK.md](./docs/CLIENT-DELIVERY-HANDBOOK.md)** — **คู่มือส่งมอบลูกค้า** (ติดตั้ง, ใช้งาน, FAQ — อ่านง่าย)
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — โมดูล backend, API, การเชื่อมต่อ frontend / `shared/`
- **[docs/DEPLOY.md](./docs/DEPLOY.md)** — env, CORS, cookie, Nginx — **เตรียม deploy production**
- **`shared/`** — `getApiBaseUrl()` ใช้ร่วมกันระหว่าง `admin/` และ `user/` (import `@boxphon/shared/...`)

### ตัวอย่าง env (คัดลอกแล้วแก้)

- `backend/.env.example` → `.env`
- `admin/.env.example` → `.env.local`
- `user/.env.example` → `.env.local`

## วิธีการรันโปรเจค (Getting Started)

### 1. Backend (Server & Database)
เพื่อนที่โคลนไป ต้องทำสิ่งนี้ก่อนเพื่อให้ Database ทำงาน:

```bash
cd backend
# 1. สร้างไฟล์ .env (ถ้าไม่มี) โดยให้ copy จากเพื่อน หรือดูตัวอย่างด้านล่าง
# 2. ติดตั้ง dependencies
npm install
# 3. รัน Database (ต้องเปิด Docker Desktop ก่อน)
docker-compose up -d
# 4. รัน Server
npm run start:dev
```

**Backend .env Setup:**
```env
PORT=3031
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=admin
DB_PASSWORD=password123
DB_NAME=remote_control_db
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redispass123
JWT_SECRET=supersecretkey123
```

---

### 2. Frontend (Web Dashboard)
เปิด Terminal อีกจอ:

```bash
cd frontend
# 1. ติดตั้ง dependencies
npm install
# 2. รัน Web
npm run dev
```

เข้าใช้งานได้ที่: [http://localhost:3000](http://localhost:3000)

---

### 3. Mobile Agent (Android)

**เลือกวิธีเชื่อมต่อ:**

#### วิธีที่ 1: Android Agent (Kotlin App) - เชื่อมต่อผ่าน Network
1. เปิด **Android Studio**
2. Open Project ไปที่โฟลเดอร์ `android-agent`
3. แก้ไข IP Address ในไฟล์ `SocketManager.kt` ให้เป็น IP ภายในวง LAN ของเครื่อง Server (เช่น `192.168.1.xxx`) *อย่าใช้ localhost บนมือถือ*
4. Run App ลงเครื่องจริง

#### วิธีที่ 2: USB Bridge (เสี่ยวเหว๋ย) - เชื่อมต่อผ่าน USB ⭐
1. **ติดตั้ง ADB** (Android Debug Bridge)
   - Windows: ดาวน์โหลดจาก [Android SDK Platform Tools](https://developer.android.com/studio/releases/platform-tools)
   - หรือติดตั้งผ่าน Android Studio SDK Manager
2. **เปิด USB Debugging** บนมือถือ:
   - Settings → About phone → แตะ "Build number" 7 ครั้ง
   - Settings → Developer options → เปิด "USB debugging"
3. **เสียบ USB** เข้ากับคอมพิวเตอร์
4. **ตรวจสอบการเชื่อมต่อ:**
   ```bash
   adb devices
   ```
   ควรเห็นอุปกรณ์แสดงในรายการ
5. **รัน USB Bridge Service:**
   ```bash
   # จากโฟลเดอร์ root ของโปรเจกต์
   node tools/usb-bridge.js
   ```
6. **ตั้งค่า Environment Variables (ถ้าต้องการ):**
   ```bash
   # Windows (PowerShell)
   $env:BACKEND_URL="http://localhost:3031"
   $env:DEVICE_ID="usb_device_1"
   $env:STREAM_FPS="5"
   node tools/usb-bridge.js
   
   # Linux/Mac
   BACKEND_URL=http://localhost:3031 DEVICE_ID=usb_device_1 STREAM_FPS=5 node tools/usb-bridge.js
   ```

**ดูคู่มือเพิ่มเติม:** [XIAOWEI_CONNECTION_GUIDE.md](./XIAOWEI_CONNECTION_GUIDE.md)

---

## คู่มือดึงภาพหน้าจอ (Screenshot) — สำคัญ ห้ามลบ

การตั้งค่าให้ Dashboard ดึงภาพหน้าจอจากเครื่อง Android ได้ (รวมถึงการ deploy / ส่งมอบลูกค้า) อยู่ในคู่มือแยกดังนี้:

- **[docs/SCREENSHOT-SETUP.md](./docs/SCREENSHOT-SETUP.md)** — คู่มือการตั้งค่า screenshot ตั้งแต่ติดตั้ง ADB จนดึงภาพได้ และ checklist สำหรับ production  
- **สำคัญ ห้ามลบ** ไฟล์คู่มือและส่วนอ้างอิงนี้

---

## Troubleshooting
- **Error: "error during connect..."** -> แปลว่าลืมเปิด Docker Desktop ให้เปิดโปรแกรมแล้วรอสักพักค่อยรันคำสั่งใหม่
- **Database connect fail** -> ลองเช็คว่า docker container ทำงานอยู่ไหมด้วยคำสั่ง `docker ps`
