# Remote Control Android System

## Pre-requisites (สิ่งที่ต้องมี)
1. **Node.js**: v18+
2. **Docker Desktop**: ต้องติดตั้งและ **เปิดโปรแกรมทิ้งไว้** เสมอ
3. **Android Studio**: สำหรับรัน Mobile Agent

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
PORT=3001
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
1. เปิด **Android Studio**
2. Open Project ไปที่โฟลเดอร์ `android-agent`
3. แก้ไข IP Address ในไฟล์ `SocketManager.kt` ให้เป็น IP ภายในวง LAN ของเครื่อง Server (เช่น `192.168.1.xxx`) *อย่าใช้ localhost บนมือถือ*
4. Run App ลงเครื่องจริง

---

## Troubleshooting
- **Error: "error during connect..."** -> แปลว่าลืมเปิด Docker Desktop ให้เปิดโปรแกรมแล้วรอสักพักค่อยรันคำสั่งใหม่
- **Database connect fail** -> ลองเช็คว่า docker container ทำงานอยู่ไหมด้วยคำสั่ง `docker ps`
