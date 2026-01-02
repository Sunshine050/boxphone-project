# 🚀 วิธีใช้งาน Postman Collection - แบบง่ายๆ

## ⚠️ **สำคัญมาก: ต้องทำตามลำดับ!**

ถ้าได้ **401 Unauthorized** = ยังไม่ได้ Login หรือ Token หมดอายุ

---

## 📋 **ลำดับการใช้งาน (ทำตามนี้เลย)**

### **1️⃣ Login ก่อน (สำคัญมาก!)**

1. เปิด folder **Auth**
2. คลิก request **Login (Admin)**
3. คลิกปุ่ม **Send** (สีน้ำเงิน)
4. ตรวจสอบ:
   - ✅ Status: `200 OK`
   - ✅ Response มี `access_token`
   - ✅ ดู tab **Test Results** → ควรเห็น "Admin token saved"

**ถ้า Login ไม่ได้:**
- ตรวจสอบ password: `admin123456`
- ตรวจสอบ backend server ทำงานอยู่ (`npm run start:dev`)
- รัน script สร้าง admin: `cd backend && npx ts-node scripts/create-admin.ts`

---

### **2️⃣ สร้าง User**

1. เปิด folder **Users**
2. คลิก request **Create User (Admin)**
3. คลิก **Send**
4. ตรวจสอบ:
   - ✅ Status: `201 Created`
   - ✅ Response มี `user.id`
   - ✅ ดู tab **Test Results** → ควรเห็น "User ID saved"

---

### **3️⃣ สร้าง Device**

1. เปิด folder **Devices**
2. คลิก request **Create Device**
3. คลิก **Send**
4. ตรวจสอบ:
   - ✅ Status: `201 Created`
   - ✅ Response มี `_id`
   - ✅ ดู tab **Test Results** → ควรเห็น "device_id saved"

**ทำซ้ำอีกครั้ง** เพื่อสร้าง Device ตัวที่ 2 (สำหรับ Move Session)

---

### **4️⃣ Connect User to Device**

1. เปิด folder **Users**
2. คลิก request **Connect User to Device**
3. คลิก **Send**
4. ตรวจสอบ:
   - ✅ Status: `200` หรือ `201`
   - ✅ User `status` เปลี่ยนเป็น `"INUSE"`

---

### **5️⃣ สร้าง Session**

1. เปิด folder **Sessions**
2. คลิก request **Create Session**
3. คลิก **Send**
4. ตรวจสอบ:
   - ✅ Status: `201 Created`
   - ✅ Response มี `session.id`

---

### **6️⃣ ทดสอบ Move Session**

1. **Pause Session** → หยุด session (จำลองเครื่องหลุด)
2. **Get Remaining Time** → ดูเวลาที่เหลือ (ควร freeze)
3. **Move Session** → ย้ายไป Device ตัวที่ 2
4. **Get Move Logs** → ดู log การย้าย

---

## 🔍 **วิธีตรวจสอบว่า Token ถูกบันทึกหรือไม่**

### **วิธีที่ 1: ดู Collection Variables**

1. คลิกขวาที่ Collection **"Boxphon Backend API"** → **Edit**
2. ไปที่ tab **Variables**
3. ดูค่า `admin_token`:
   - ✅ **มีค่า** (ยาวๆ) = Token ถูกบันทึกแล้ว
   - ❌ **ว่าง** = ต้อง Login ใหม่

### **วิธีที่ 2: ดู Test Results**

หลังรัน **Login (Admin)**:
1. ดูที่ tab **Test Results** (ด้านล่าง)
2. ควรเห็น:
   ```
   ✓ Status code is 200
   ✓ Response has access_token
   ✓ Save admin_token
   ```

### **วิธีที่ 3: ดู Console**

1. เปิด Postman Console: **View → Show Postman Console**
2. หลังรัน Login ควรเห็น:
   ```
   Admin token saved: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## ❌ **แก้ไข 401 Unauthorized**

### **สาเหตุ:**
- ยังไม่ได้ Login
- Token หมดอายุ
- Token ไม่ถูกบันทึก

### **วิธีแก้:**
1. **Login ใหม่** (Step 1)
2. **ตรวจสอบ Token ถูกบันทึก** (ดู Collection Variables)
3. **รัน request อีกครั้ง**

---

## ✅ **Checklist ก่อนเริ่มทดสอบ**

- [ ] Backend server ทำงานอยู่ (`npm run start:dev`)
- [ ] MongoDB ทำงานอยู่
- [ ] Import Postman Collection แล้ว
- [ ] Login สำเร็จ → Token ถูกบันทึก

---

## 📝 **ลำดับที่ถูกต้อง (สรุป)**

```
1. Login (Admin)          ← ต้องทำก่อน!
   ↓
2. Create User            ← ใช้ admin_token
   ↓
3. Create Device          ← ใช้ admin_token
   ↓
4. Create Device (อีกครั้ง) ← Device ตัวที่ 2
   ↓
5. Connect User to Device ← ใช้ admin_token, user_id, device_id
   ↓
6. Create Session          ← ใช้ admin_token, user_id, device_id
   ↓
7. ทดสอบ Move Session      ← Pause → Move → Get Logs
```

---

## 💡 **Tips**

1. **ต้อง Login ก่อนทุกครั้ง** ที่เริ่มทดสอบใหม่
2. **Token หมดอายุ** (1 วัน) → Login ใหม่
3. **ตรวจสอบ Collection Variables** ถ้า request ไม่ได้
4. **ดู Test Results** เพื่อยืนยันว่า Variables ถูกบันทึก
5. **ทำตามลำดับ** เพราะแต่ละ Step ใช้ Variables จาก Step ก่อนหน้า

---

## 🐛 **Troubleshooting**

### **Login ไม่ได้ (401)**
- ตรวจสอบ password: `admin123456`
- รัน script: `cd backend && npx ts-node scripts/create-admin.ts`

### **Create User ไม่ได้ (401)**
- **ต้อง Login ก่อน!** (Step 1)
- ตรวจสอบ `admin_token` มีค่าใน Collection Variables

### **Connect User to Device ไม่ได้ (401)**
- **ต้อง Login ก่อน!** (Step 1)
- ตรวจสอบ `admin_token` มีค่า
- ตรวจสอบ `user_id` และ `device_id` ถูกบันทึก

### **Variables ไม่ถูกบันทึก**
- ตรวจสอบ request สำเร็จ (Status 200/201)
- ดู Test Results tab
- ดู Console logs

---

## 🚀 **เริ่มต้นใช้งาน**

1. **เปิด Postman**
2. **Import Collection** (`postman_collection.json`)
3. **Login** (Auth → Login (Admin))
4. **ทำตามลำดับ** Step 1-6 ด้านบน

---

## 📚 **ดูรายละเอียดเพิ่มเติม**

- **TESTING_GUIDE.md** - คู่มือการทดสอบแบบละเอียด (17 ขั้นตอน)
- **POSTMAN_SETUP.md** - คู่มือการตั้งค่า Postman

---

**Happy Testing! 🎉**

