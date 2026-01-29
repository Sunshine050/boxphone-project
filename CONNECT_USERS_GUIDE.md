# 🔗 คู่มือการเชื่อมต่อ User กับ Device และสร้าง Session

## ✅ สถานะปัจจุบัน

- ✅ User `thinnakorn` ถูกสร้างแล้ว
- ✅ User `thinnakorn` ถูกเชื่อมต่อกับ Device แล้ว
- ⚠️ Session creation ล้มเหลว (อาจเกิดจาก SESSION_MAX_MOVE_COUNT ไม่ได้ตั้งค่า)

---

## 🔧 วิธีแก้ไขปัญหา Session Creation

### ตรวจสอบ Backend .env

ตรวจสอบว่า Backend `.env` มี:
```env
SESSION_MAX_MOVE_COUNT=2
```

ถ้าไม่มี ให้เพิ่มเข้าไป

---

## 🚀 วิธีใช้งาน Script

### 1. **เชื่อมต่อ User ที่มีอยู่แล้ว**

```bash
# เชื่อมต่อ user ที่ชื่อ "thinnakorn"
USERNAME=thinnakorn npm run connect-users

# หรือเชื่อมต่อ user ทั้งหมด (USER role)
npm run connect-users
```

### 2. **ตั้งค่า Environment Variables**

```bash
# Windows (PowerShell)
$env:USERNAME="thinnakorn"
$env:DEVICE_SERIAL="usb_device_1769707650580"
$env:SESSION_SECONDS="3600"
npm run connect-users

# Linux/Mac
USERNAME=thinnakorn DEVICE_SERIAL=usb_device_1769707650580 SESSION_SECONDS=3600 npm run connect-users
```

---

## 📋 Environment Variables

- `BACKEND_URL`: URL ของ Backend (default: `http://127.0.0.1:3031`)
- `ADMIN_USERNAME`: Username ของ Admin (default: `admin`)
- `ADMIN_PASSWORD`: Password ของ Admin (default: `admin123456`)
- `USERNAME`: Username ที่ต้องการเชื่อมต่อ (null = เชื่อมต่อทั้งหมด)
- `DEVICE_SERIAL`: Serial number ของ Device (default: `usb_device_1769707650580`)
- `SESSION_PACKAGE`: Package name (default: `BASIC`)
- `SESSION_SECONDS`: ระยะเวลา Session เป็นวินาที (default: `3600` = 1 ชั่วโมง)

---

## ✅ สรุป

1. ✅ User `thinnakorn` ถูกสร้างและเชื่อมต่อกับ Device แล้ว
2. ⏭️ **ต่อไป:** ตรวจสอบ Backend `.env` ว่ามี `SESSION_MAX_MOVE_COUNT` หรือไม่
3. ⏭️ **ต่อไป:** รัน script อีกครั้งเพื่อสร้าง Session

---

## 🔍 ตรวจสอบ

1. **ตรวจสอบ User:**
   - ไปที่: http://localhost:3000/admin/users
   - ควรเห็น User `thinnakorn` ที่เชื่อมต่อกับ Device แล้ว

2. **ตรวจสอบ Device:**
   - ไปที่: http://localhost:3000/admin/devices
   - ควรเห็น Device `SM-N960F` ที่ถูกใช้งานโดย User `thinnakorn`

3. **ตรวจสอบ Session:**
   - ไปที่: http://localhost:3000/admin/sessions
   - ควรเห็น Session ที่ถูกสร้างแล้ว

---

**หมายเหตุ:** ถ้า Session creation ล้มเหลว ให้ตรวจสอบ Backend logs เพื่อดู error message ที่ชัดเจน
