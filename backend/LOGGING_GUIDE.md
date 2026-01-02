# 📝 Logging Guide - ดู Logs ใน Terminal

## ✅ **เพิ่ม Logging ครบทุกส่วนแล้ว!**

ตอนนี้เมื่อเทส Postman ทุก request และ error จะแสดงใน terminal ที่รัน `npm run start:dev`

---

## 📊 **Log Format**

### **Success Logs (✅)**
```
[LOGIN] ✅ Success - Username: admin, Role: ADMIN
[CREATE_USER] ✅ Success - User ID: 65a1b2c3..., Username: testuser, Package: BASIC
[CREATE_DEVICE] ✅ Success - Device ID: 65a1b2c3..., Name: Test Device 1
[CREATE_SESSION] ✅ Success - Session ID: 65a1b2c3..., Status: ACTIVE, Remaining: 7200s
[PAUSE_SESSION] ✅ Success - Session ID: 65a1b2c3..., Status: DISCONNECTED, Remaining: 7198s (FROZEN)
[MOVE_SESSION] ✅ Success - Session ID: 65a1b2c3..., Remaining: 7198s (UNCHANGED), Moved Count: 1
```

### **Error Logs (❌)**
```
[AUTH] ❌ No Authorization header - Method: POST, Path: /users
[AUTH] ❌ Unauthorized - Method: POST, Path: /users, Error: Invalid token
[ROLES] ❌ Forbidden - User: testuser, Role: USER, Required: ADMIN
[CREATE_USER] ❌ Failed - Username: testuser, Error: Username already exists
[CONNECT_DEVICE] ❌ Failed - User ID: 65a1b2c3..., Device ID: 65a1b2c3..., Error: Device not found
```

### **Debug Logs**
```
[AUTH] Checking token - Method: POST, Path: /users
[AUTH] ✅ Authenticated - User: admin, Role: ADMIN, Method: POST, Path: /users
[ROLES] ✅ Authorized - User: admin, Role: ADMIN, Method: POST, Path: /users
[GET_REMAINING_TIME] Checking remaining time for Session ID: 65a1b2c3...
```

---

## 🔍 **Log Categories**

### **1. Authentication (AUTH)**
- ✅ Login สำเร็จ
- ❌ ไม่มี Authorization header
- ❌ Token ไม่ถูกต้อง
- ❌ Token หมดอายุ

### **2. Authorization (ROLES)**
- ✅ User มีสิทธิ์เข้าถึง
- ❌ User ไม่มีสิทธิ์ (Forbidden)
- ❌ ไม่มี user ใน request

### **3. User Operations**
- `[CREATE_USER]` - สร้าง User
- `[CONNECT_DEVICE]` - เชื่อม User กับ Device
- `[DISCONNECT_DEVICE]` - ยกเลิกการเชื่อม

### **4. Device Operations**
- `[CREATE_DEVICE]` - สร้าง Device

### **5. Session Operations**
- `[CREATE_SESSION]` - สร้าง Session
- `[PAUSE_SESSION]` - หยุด Session (เวลา freeze)
- `[RESUME_SESSION]` - เริ่ม Session ต่อ
- `[MOVE_SESSION]` - ย้าย Session ไปเครื่องอื่น
- `[GET_REMAINING_TIME]` - ดูเวลาที่เหลือ

---

## 📋 **ตัวอย่าง Logs เมื่อเทส Postman**

### **Step 1: Login**
```
[LOGIN] Attempting login for username: admin
[LOGIN] Checking user: admin
[LOGIN] User found, validating password for: admin
[LOGIN] ✅ Token generated for user: admin (ID: 65a1b2c3...)
[LOGIN] ✅ Success - Username: admin, Role: ADMIN
```

### **Step 2: Create User (ถ้าได้ 401)**
```
[AUTH] ❌ No Authorization header - Method: POST, Path: /users
```
**หรือ**
```
[AUTH] Checking token - Method: POST, Path: /users
[AUTH] ❌ Unauthorized - Method: POST, Path: /users, Error: Invalid token
```

### **Step 3: Create User (สำเร็จ)**
```
[AUTH] Checking token - Method: POST, Path: /users
[AUTH] ✅ Authenticated - User: admin, Role: ADMIN, Method: POST, Path: /users
[ROLES] ✅ Authorized - User: admin, Role: ADMIN, Method: POST, Path: /users
[CREATE_USER] Admin: admin creating user: testuser
[CREATE_USER] ✅ Success - User ID: 65a1b2c3..., Username: testuser, Package: BASIC
```

### **Step 4: Create Device**
```
[CREATE_DEVICE] Admin: admin creating device: Test Device 1, Serial: DEVICE001
[CREATE_DEVICE] ✅ Success - Device ID: 65a1b2c3..., Name: Test Device 1, Serial: DEVICE001
```

### **Step 5: Connect User to Device**
```
[CONNECT_DEVICE] Admin: admin connecting User ID: 65a1b2c3... to Device ID: 65a1b2c3...
[CONNECT_DEVICE] ✅ Success - User ID: 65a1b2c3..., Device ID: 65a1b2c3..., Status: INUSE
```

### **Step 6: Create Session**
```
[CREATE_SESSION] Admin: admin creating session - User ID: 65a1b2c3..., Device ID: 65a1b2c3..., Package: BASIC, Total Seconds: 7200
[CREATE_SESSION] ✅ Success - Session ID: 65a1b2c3..., User ID: 65a1b2c3..., Device ID: 65a1b2c3..., Status: ACTIVE, Remaining: 7200s
```

### **Step 8: Pause Session**
```
[PAUSE_SESSION] Admin: admin pausing Session ID: 65a1b2c3..., Reason: Device disconnected - testing
[PAUSE_SESSION] ✅ Success - Session ID: 65a1b2c3..., Status: DISCONNECTED, Remaining: 7198s (FROZEN)
```

### **Step 10: Move Session**
```
[MOVE_SESSION] Admin: admin moving Session ID: 65a1b2c3... to Device ID: 65a1b2c3..., Reason: Device 1 broken, moving to Device 2
[MOVE_SESSION] ✅ Success - Session ID: 65a1b2c3..., From Device: 65a1b2c3..., To Device: 65a1b2c3..., Remaining: 7198s (UNCHANGED), Moved Count: 1
```

---

## 🐛 **Debugging 401 Unauthorized**

### **กรณีที่ 1: ไม่มี Authorization header**
```
[AUTH] ❌ No Authorization header - Method: POST, Path: /users
```
**แก้ไข:** ตรวจสอบว่า request มี `Authorization: Bearer {{admin_token}}` header

### **กรณีที่ 2: Token ไม่ถูกต้อง**
```
[AUTH] Checking token - Method: POST, Path: /users
[AUTH] ❌ Unauthorized - Method: POST, Path: /users, Error: Invalid token
```
**แก้ไข:** Login ใหม่เพื่อได้ token ใหม่

### **กรณีที่ 3: Token หมดอายุ**
```
[AUTH] ❌ Unauthorized - Method: POST, Path: /users, Error: jwt expired
```
**แก้ไข:** Login ใหม่

---

## 🐛 **Debugging 403 Forbidden**

```
[ROLES] ❌ Forbidden - User: testuser, Role: USER, Required: ADMIN, Method: POST, Path: /users
```
**แก้ไข:** ใช้ Admin account (login เป็น admin)

---

## 🐛 **Debugging Business Logic Errors**

### **Username ซ้ำ**
```
[CREATE_USER] Admin: admin creating user: testuser
[CREATE_USER] ❌ Failed - Username: testuser, Error: Username already exists
```

### **Device ไม่พบ**
```
[CONNECT_DEVICE] Admin: admin connecting User ID: 65a1b2c3... to Device ID: invalid
[CONNECT_DEVICE] ❌ Failed - User ID: 65a1b2c3..., Device ID: invalid, Error: Device not found
```

### **Session Move เกิน Limit**
```
[MOVE_SESSION] Admin: admin moving Session ID: 65a1b2c3... to Device ID: 65a1b2c3...
[MOVE_SESSION] ❌ Failed - Session ID: 65a1b2c3..., To Device: 65a1b2c3..., Error: Maximum move count exceeded
```

---

## 💡 **Tips**

1. **ดู Terminal ตลอดเวลา** - ทุก request จะแสดง log
2. **หา [❌]** - เพื่อหา error เร็วๆ
3. **หา [✅]** - เพื่อยืนยันว่า operation สำเร็จ
4. **ดู Method และ Path** - เพื่อรู้ว่า request ไหนเกิด error
5. **ดู Error Message** - เพื่อรู้สาเหตุที่แน่ชัด

---

## 📚 **Log Levels**

- **LOG** - Operations สำเร็จ (✅)
- **WARN** - Warning (เช่น ไม่มี Authorization header)
- **ERROR** - Error (❌)
- **DEBUG** - Debug information (เช่น กำลังตรวจสอบ token)

---

## 🚀 **พร้อมใช้งาน!**

ตอนนี้เมื่อรัน `npm run start:dev` และเทส Postman ทุก request และ error จะแสดงใน terminal ทันที!

**Happy Testing! 🎉**

