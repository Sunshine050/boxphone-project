# 🚀 คู่มือเริ่มต้นใช้งาน BoxPhone ผ่าน USB

## ✅ สถานะปัจจุบัน

- ✅ USB Bridge เชื่อมต่อกับ Backend สำเร็จ
- ✅ Device ถูก register แล้ว (Device ID: `usb_device_1769705304723`)
- ✅ Screen streaming ทำงานแล้ว (5 FPS)

---

## 📋 ขั้นตอนต่อไป

### 1. รัน Frontend (User Panel)

เปิด **Terminal ใหม่** (หรือ Terminal อื่น) แล้วรัน:

```bash
cd D:\boxphon-project\user
npm install  # ถ้ายังไม่ได้ติดตั้ง
npm run dev
```

รอให้เห็น:
```
✓ Ready in X seconds
○ Local: http://localhost:3000
```

---

### 2. เข้าสู่ระบบ Admin Panel

1. เปิดเบราว์เซอร์ไปที่: **http://localhost:3000**
2. หรือเข้าสู่ระบบ Admin Panel:
   - ไปที่: **http://localhost:3000/admin** (ถ้ามี)
   - หรือใช้ API endpoint: **http://localhost:3001/api/auth/login**

**ข้อมูล Login (default):**
- Username: `admin`
- Password: `admin123` (หรือตามที่ตั้งไว้)

---

### 3. ตรวจสอบ Device ในระบบ

หลังจาก login แล้ว:

1. ไปที่หน้า **Devices** หรือ **Device Management**
2. ควรเห็น Device ที่ชื่อ `SM-N960F` หรือ Device ID `usb_device_1769705304723`
3. สถานะควรเป็น **Available** หรือ **Online**

---

### 4. สร้าง Session และเชื่อมต่อ User กับ Device

1. ไปที่หน้า **Users** หรือ **User Management**
2. สร้าง User ใหม่ (หรือใช้ User ที่มีอยู่)
3. เติมเวลาให้ User (เช่น 1 ชั่วโมง)
4. เชื่อมต่อ User กับ Device:
   - คลิก "Connect Device" หรือ "Assign Device"
   - เลือก Device ที่ต้องการ (เช่น `usb_device_1769705304723`)

---

### 5. เริ่มใช้งาน

1. Login เป็น User ที่เชื่อมต่อกับ Device แล้ว
2. ไปที่หน้า **Control** หรือ **Session**
3. ควรเห็นภาพหน้าจอมือถือแบบเรียลไทม์
4. คลิกที่หน้าจอเพื่อควบคุมมือถือได้

---

## 🔍 ตรวจสอบการทำงาน

### ตรวจสอบ Backend Logs

ดูที่ Terminal ที่รัน Backend ควรเห็น:
```
[AppGateway] Device Registered: usb_device_1769705304723
[AppGateway] User xxx joined control room for usb_device_1769705304723
```

### ตรวจสอบ USB Bridge Logs

ดูที่ Terminal ที่รัน USB Bridge ควรเห็น:
```
✅ Connected to Backend
📝 Registered device: usb_device_1769705304723
📺 Starting screen stream...
⏱️  Streaming at 5 FPS (200ms interval)
```

---

## ⚠️ ปัญหาที่อาจเจอ

### ปัญหา: ไม่เห็น Device ในระบบ

**วิธีแก้:**
1. เช็คว่า USB Bridge ยังรันอยู่หรือไม่
2. เช็คว่า Backend รับข้อมูล device แล้วหรือยัง (ดู Backend logs)
3. ลอง refresh หน้า Devices

### ปัญหา: ไม่เห็นภาพหน้าจอ

**วิธีแก้:**
1. เช็คว่า USB Bridge ยังรันอยู่หรือไม่
2. เช็คว่า Device ถูกเชื่อมต่อกับ User แล้วหรือยัง
3. เช็คว่า Session ถูกสร้างและ Active แล้วหรือยัง
4. ลอง refresh หน้า Control

### ปัญหา: คลิกที่หน้าจอแล้วไม่ทำงาน

**วิธีแก้:**
1. เช็คว่า USB Bridge ยังรันอยู่หรือไม่
2. เช็คว่า ADB ยังเชื่อมต่อกับมือถืออยู่หรือไม่ (รัน `adb devices`)
3. เช็ค Backend logs ว่ามีการส่งคำสั่งไปยัง Device หรือไม่

---

## 📝 สรุป

1. ✅ USB Bridge ทำงานแล้ว
2. ⏭️ **ต่อไป:** รัน Frontend (`cd user && npm run dev`)
3. ⏭️ **ต่อไป:** Login เข้า Admin Panel
4. ⏭️ **ต่อไป:** เชื่อมต่อ User กับ Device
5. ⏭️ **ต่อไป:** เริ่มใช้งานผ่าน Web

---

## 🎯 Quick Commands

```bash
# Terminal 1: Backend
cd D:\boxphon-project\backend
npm run start:dev

# Terminal 2: USB Bridge
cd D:\boxphon-project
npm run usb-bridge

# Terminal 3: Frontend (User Panel)
cd D:\boxphon-project\user
npm run dev
```

---

**หมายเหตุ:** ต้องรันทั้ง 3 ส่วนพร้อมกัน:
- ✅ Backend (Terminal 1)
- ✅ USB Bridge (Terminal 2) 
- ⏭️ Frontend (Terminal 3) - **ต้องรันต่อ**
