# 🔌 ข้อมูล Ports ของ BoxPhone

## 📋 Ports ที่ใช้ในโปรเจกต์

### 1. **Backend Server** 
- **Port:** `3031`
- **URL:** http://localhost:3031
- **ใช้สำหรับ:** API, WebSocket, Database
- **รันด้วย:** `cd backend && npm run start:dev`

### 2. **Admin Panel** (Frontend)
- **Port:** `3000`
- **URL:** http://localhost:3000
- **ใช้สำหรับ:** Admin Dashboard
- **รันด้วย:** `cd admin && npm run dev`

### 3. **User Panel** (Frontend)
- **Port:** `3000` หรือ `3002` (ถ้า 3000 ถูกใช้งาน)
- **URL:** http://localhost:3000 หรือ http://localhost:3002
- **ใช้สำหรับ:** User Dashboard
- **รันด้วย:** `cd user && npm run dev`

---

## ⚠️ หมายเหตุ

- **Backend ต้องรันที่ port 3031** (ตามที่ตั้งค่าไว้)
- **Frontend (Admin/User) จะใช้ port 3000** (ถ้าว่าง) หรือ port อื่นอัตโนมัติ
- ถ้า port 3000 ถูกใช้งาน Frontend จะใช้ port ถัดไป (3001, 3002, ...)

---

## 🚀 วิธีรันทั้งหมด

### Terminal 1: Backend
```bash
cd D:\boxphon-project\backend
npm run start:dev
```
→ รันที่ http://localhost:3031

### Terminal 2: USB Bridge
```bash
cd D:\boxphon-project
npm run usb-bridge
```
→ เชื่อมต่อกับ Backend ที่ port 3031

### Terminal 3: Admin Panel
```bash
cd D:\boxphon-project\admin
npm run dev
```
→ รันที่ http://localhost:3000

### Terminal 4: User Panel (ถ้าต้องการ)
```bash
cd D:\boxphon-project\user
npm run dev
```
→ รันที่ http://localhost:3000 หรือ port อื่น

---

## 🔍 ตรวจสอบ Ports

### Windows:
```bash
netstat -ano | findstr :3000
netstat -ano | findstr :3031
```

### Linux/Mac:
```bash
lsof -i :3000
lsof -i :3031
```

---

## 📝 สรุป

- ✅ **Backend:** http://localhost:3031
- ✅ **Admin Panel:** http://localhost:3000
- ✅ **User Panel:** http://localhost:3000 (หรือ port อื่น)

**สำคัญ:** ต้องรัน Backend ก่อน Frontend ถึงจะใช้งานได้!
