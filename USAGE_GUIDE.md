# 📱 คู่มือการใช้งาน BoxPhone หลังจากเชื่อมต่อสำเร็จ

## ✅ สถานะปัจจุบัน

- ✅ USB Bridge เชื่อมต่อ Backend สำเร็จ
- ✅ Device ถูก register แล้ว (`usb_device_1769707650580`)
- ✅ Screen streaming ทำงานแล้ว (5 FPS)
- ✅ Backend รับ connection แล้ว

---

## 🎯 ขั้นตอนต่อไป

### 1. **ตรวจสอบ Device ใน Admin Panel**

1. เปิดเบราว์เซอร์ไปที่: **http://localhost:3000/admin/devices**
2. ควรเห็น Device ที่ชื่อ `SM-N960F` หรือ Device ID `usb_device_1769707650580`
3. สถานะควรเป็น **Available** หรือ **Online**

**ถ้าไม่เห็น Device:**
- รอสักครู่แล้ว refresh หน้า
- หรือไปที่หน้า Devices แล้วกด refresh

---

### 2. **สร้าง User**

1. ไปที่หน้า **Users** ใน Admin Panel: http://localhost:3000/admin/users
2. คลิก **"Create User"** หรือ **"เพิ่มผู้ใช้"**
3. กรอกข้อมูล:
   - **Username:** (เช่น `testuser`)
   - **Password:** (เช่น `password123`)
   - **Role:** `USER`
4. คลิก **"Create"** หรือ **"สร้าง"**

---

### 3. **เติมเวลาให้ User**

1. หลังจากสร้าง User แล้ว คลิกที่ User ที่ต้องการ
2. คลิก **"Add Time"** หรือ **"เติมเวลา"**
3. เลือกเวลา (เช่น 1 ชั่วโมง, 1 วัน)
4. คลิก **"Confirm"** หรือ **"ยืนยัน"**

---

### 4. **เชื่อมต่อ User กับ Device**

1. ไปที่หน้า **Users** หรือ **Devices**
2. คลิกที่ User ที่ต้องการ
3. คลิก **"Connect Device"** หรือ **"เชื่อมต่อ Device"**
4. เลือก Device ที่ต้องการ (เช่น `usb_device_1769707650580`)
5. คลิก **"Confirm"** หรือ **"ยืนยัน"**

---

### 5. **สร้าง Session**

1. ไปที่หน้า **Sessions** ใน Admin Panel: http://localhost:3000/admin/sessions
2. คลิก **"Create Session"** หรือ **"สร้าง Session"**
3. เลือก:
   - **User:** เลือก User ที่ต้องการ
   - **Device:** เลือก Device ที่ต้องการ (เช่น `usb_device_1769707650580`)
   - **Duration:** ตั้งค่าเวลา (เช่น 1 ชั่วโมง)
4. คลิก **"Create"** หรือ **"สร้าง"**

---

### 6. **เริ่มใช้งาน (สำหรับ User)**

1. **Login เป็น User:**
   - ไปที่: http://localhost:3000/login
   - Login ด้วย Username และ Password ที่สร้างไว้

2. **เข้าสู่หน้า Control:**
   - หลังจาก login แล้ว ควรเห็นหน้า Control หรือ Session
   - ควรเห็นภาพหน้าจอมือถือแบบเรียลไทม์

3. **ควบคุมมือถือ:**
   - **คลิก:** คลิกที่หน้าจอเพื่อคลิกที่มือถือ
   - **Swipe:** ลากเพื่อ swipe
   - **Type:** พิมพ์ข้อความ (ถ้ามีฟีเจอร์)

---

## 🔍 ตรวจสอบการทำงาน

### ตรวจสอบ Backend Logs

ดูที่ Terminal ที่รัน Backend ควรเห็น:
```
[AppGateway] Client connected: xxxxx
[AppGateway] Device Registered: usb_device_xxxxx
[AppGateway] User xxx joined control room for usb_device_xxxxx
```

### ตรวจสอบ USB Bridge Logs

ดูที่ Terminal ที่รัน USB Bridge ควรเห็น:
```
✅ Connected to Backend
📝 Registered device: usb_device_xxxxx
📺 Starting screen stream...
⏱️  Streaming at 5 FPS (200ms interval)
```

### ตรวจสอบ Device ใน Admin Panel

1. ไปที่: http://localhost:3000/admin/devices
2. ควรเห็น Device ที่ชื่อ `SM-N960F`
3. สถานะควรเป็น **Available** หรือ **Online**

---

## ⚠️ ปัญหาที่อาจเจอ

### ปัญหา: ไม่เห็น Device ใน Admin Panel

**วิธีแก้:**
1. รอสักครู่แล้ว refresh หน้า
2. เช็คว่า USB Bridge ยังรันอยู่หรือไม่
3. เช็คว่า Backend รับ connection แล้วหรือยัง (ดู Backend logs)

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

1. ✅ USB Bridge เชื่อมต่อสำเร็จแล้ว
2. ⏭️ **ต่อไป:** ตรวจสอบ Device ใน Admin Panel
3. ⏭️ **ต่อไป:** สร้าง User และเติมเวลา
4. ⏭️ **ต่อไป:** เชื่อมต่อ User กับ Device
5. ⏭️ **ต่อไป:** สร้าง Session
6. ⏭️ **ต่อไป:** เริ่มใช้งานผ่าน Web

---

## 🎯 Quick Checklist

- [x] USB Bridge เชื่อมต่อ Backend สำเร็จ
- [x] Device ถูก Register แล้ว
- [ ] Device แสดงใน Admin Panel
- [ ] สร้าง User และเติมเวลา
- [ ] เชื่อมต่อ User กับ Device
- [ ] สร้าง Session
- [ ] เริ่มใช้งานผ่าน Web

---

**หมายเหตุ:** เสี่ยวเหว๋ย (Xiaowei) ไม่จำเป็นต้องใช้แล้ว เพราะ USB Bridge ทำงานแทนแล้ว!
