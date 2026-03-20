# ⚠️ สำคัญ: เสี่ยวเหว๋ยต้อง Activate Account/Device ก่อนใช้งาน

## 📋 สรุปปัญหา

### Error ที่เกิดขึ้น:
```json
{
  "code": 10001,
  "message": "กรุณาเปิดใช้งานสมาชิกภาพของคุณก่อนใช้งาน"
}
```

### สาเหตุจริง (ฟันธง):
**❌ Error นี้ไม่ได้มาจาก NestJS Backend**  
**✅ Error นี้มาจาก Software เสี่ยวเหว๋ย / BoxPhone SDK โดยตรง**

---

## 🔍 ความหมาย

### แปลว่า:
- ❌ **Box / Device ยังไม่ถูก Activate** กับระบบของเสี่ยวเหว๋ย
- ❌ **Account ยังไม่เป็นสมาชิก** / หมดอายุ / ไม่ login
- ❌ **Device ยังไม่ Bind** กับ Account

### NestJS Backend:
- ✅ **ทำงานถูกต้อง** - เป็นแค่ "ตัวกลางส่งคำสั่ง"
- ❌ **แต่สิทธิ์ถูกตัดสินที่ software เสี่ยวเหว๋ย**

---

## 🏗️ โครงสร้างที่ใช้อยู่

```
[NestJS Backend]
        |
        | WebSocket (ws://127.0.0.1:22222)
        v
[เสี่ยวเหว๋ย Service / BoxPhone Engine]
        |
        v
[Device 20 เครื่อง]
```

---

## 📊 สถานะปัจจุบัน

### Device Status:
- **Online:** 19 เครื่อง ✅
- **Authorized:** 0 เครื่อง ❌

### ทำไม Device Online แต่สั่งไม่ได้?

**เพราะเสี่ยวเหว๋ยแยก 2 เรื่อง:**

1. **🔌 Connected (ต่อได้)** ✅
   - Device เชื่อมต่อกับเสี่ยวเหว๋ยได้
   - ดูสถานะ online ได้

2. **🔐 Authorized / Member Active (มีสิทธิ์สั่ง)** ❌
   - Device ยังไม่ถูก Activate
   - Account ยังไม่เป็นสมาชิก
   - ยังไม่ Bind Device กับ Account

**👉 ตอนนี้ผ่านข้อ 1 แต่ตกข้อ 2**

---

## ✅ วิธีแก้ไข (สำคัญมาก)

### STEP 1: เช็กฝั่ง "เสี่ยวเหว๋ย" ก่อน (ไม่ใช่ Nest)

**ไปดูใน Software เสี่ยวเหว๋ย ว่ามีเมนูพวกนี้ไหม:**

1. **Account / Login**
   - ตรวจสอบว่า login แล้วหรือยัง
   - ถ้ายังไม่ login → Login ก่อน

2. **Member / VIP**
   - ตรวจสอบว่าเป็นสมาชิกแล้วหรือยัง
   - ถ้ายังไม่เป็นสมาชิก → Activate VIP ก่อน

3. **License**
   - ตรวจสอบว่า license ยังไม่หมดอายุ
   - ถ้าหมดอายุ → Renew license

4. **Device Bind**
   - ตรวจสอบว่า Device ถูก Bind กับ Account แล้วหรือยัง
   - ถ้ายังไม่ Bind → Bind Device ก่อน

5. **Trial / Expire**
   - ตรวจสอบว่า Trial ยังไม่หมดอายุ
   - ถ้าหมดอายุ → Activate License

**ถ้า:**
- ❌ ยังไม่ login
- ❌ ยังไม่ bind box
- ❌ หมดอายุ

**👉 pushEvent จะโดน 10001 ทุกครั้ง**

---

### STEP 2: BoxPhone ต้อง Activate กับ Account

**ปกติมันต้องมีขั้นตอนแบบนี้อย่างใดอย่างหนึ่ง:**

1. **ใส่ Serial Number**
   - ใส่ Serial Number ของ BoxPhone
   - Activate ผ่านหน้าเว็บหรือใน Software

2. **Bind Device กับ Account**
   - Bind Device กับ Account ที่ login อยู่
   - อาจต้องทำใน Settings หรือหน้าเว็บ

3. **Activate ผ่านหน้าเว็บ**
   - ไปที่เว็บเสี่ยวเหว๋ย
   - Activate Device ผ่านหน้าเว็บ

4. **Login บนตัว Box**
   - Login บนตัว BoxPhone เอง
   - Activate ผ่าน UI บน Box

**⚠️ ต่อให้เป็น local 127.0.0.1 ก็หนีไม่พ้น**

---

### STEP 3: NestJS ไม่ต้องแก้ JSON แล้ว

**JSON ที่ส่ง ถูกต้องแล้ว:**
```json
{
  "action": "getDeviceList",
  "device": "all",
  "data": {}
}
```

**หรือ:**
```json
{
  "action": "screenshot",
  "device": "276b135d13217ece",
  "data": {}
}
```

**❌ แก้ฝั่ง Nest ยังไงก็ไม่ผ่าน**  
**เพราะ โดน reject ที่ engine (เสี่ยวเหว๋ย)**

---

## 🎯 ทางเลือกที่มี (3 ทาง)

### 🔴 ทางที่ 1: Activate เสี่ยวเหว๋ยให้ถูกต้อง (ทางตรง)

**ขั้นตอน:**
1. ✅ **Login เสี่ยวเหว๋ย** (ถ้ายังไม่ login)
2. ✅ **Activate VIP/Membership** (ถ้ายังไม่เป็นสมาชิก)
3. ✅ **Bind Device กับ Account** (ถ้ายังไม่ bind)
4. ✅ **ตรวจสอบ License** (ถ้าหมดอายุ → Renew)

**ผลลัพธ์:**
- ✅ ใช้งานได้ทันที
- ✅ ไม่ต้องแก้โค้ด
- ✅ ใช้ได้กับ Device ทั้ง 19 เครื่อง

---

### 🟡 ทางที่ 2: ใช้ HTTP API แทน (ถ้ามี)

**ถ้าเสี่ยวเหว๋ยมี HTTP API Server:**
- ตรวจสอบว่า HTTP API Server เปิดอยู่หรือไม่
- ทดสอบว่า HTTP API ไม่ต้องการ VIP (อาจเป็นไปได้)
- ใช้ HTTP API แทน WebSocket

**⚠️ ข้อจำกัด:**
- อาจไม่มี HTTP API Server
- อาจต้องการ VIP เหมือนกัน

---

### 🟢 ทางที่ 3: ใช้ ADB โดยตรง (Bypass เสี่ยวเหว๋ย)

**ถ้า Device เชื่อมต่อผ่าน USB:**
- ใช้ ADB โดยตรง (ไม่ผ่านเสี่ยวเหว๋ย)
- ดึงหน้าจอด้วย `adb shell screencap`
- ส่งคำสั่งด้วย `adb shell input`

**⚠️ ข้อจำกัด:**
- ต้องเชื่อมต่อผ่าน USB
- ไม่สามารถใช้ผ่าน Network ได้
- ต้องมี ADB ติดตั้ง

---

## 📝 Checklist

### ก่อนใช้งานเสี่ยวเหว๋ย API:

- [ ] ✅ **Login เสี่ยวเหว๋ย** (ใน Software หรือหน้าเว็บ)
- [ ] ✅ **Activate VIP/Membership** (ถ้าจำเป็น)
- [ ] ✅ **Bind Device กับ Account** (ถ้าจำเป็น)
- [ ] ✅ **ตรวจสอบ License** (ยังไม่หมดอายุ)
- [ ] ✅ **ทดสอบ WebSocket** (ด้วย WebSocket Tool)
- [ ] ✅ **ตรวจสอบว่าได้ response code 10000** (ไม่ใช่ 10001)

---

## 🔗 ลิงก์ที่เกี่ยวข้อง

- เสี่ยวเหว๋ย Website: https://www.xiaowei.xin/
- เอกสาร API: https://www.xiaowei.xin/help/70/349
- WebSocket Testing Tool: https://wstool.js.org/

---

## ❓ ถ้ายังไม่ได้?

1. **ตรวจสอบว่า Login แล้วหรือยัง**
   - ดูที่ user info ในเสี่ยวเหว๋ย
   - ดูว่า badge "VIP" หรือ "Member" แสดงอยู่หรือไม่

2. **ตรวจสอบว่า Device Bind แล้วหรือยัง**
   - ดูใน Settings → Device Bind
   - ดูว่า Device ถูก Bind กับ Account แล้วหรือยัง

3. **ทดสอบ WebSocket ด้วย WebSocket Tool**
   - เปิด https://wstool.js.org/
   - ใส่ `ws://127.0.0.1:22222/`
   - ส่ง request: `{"action":"getDeviceList","device":"all","data":{}}`
   - ดูว่าได้ response code 10000 หรือ 10001

4. **ติดต่อเสี่ยวเหว๋ย Support**
   - สอบถามเรื่อง Account Activation
   - สอบถามเรื่อง Device Binding
   - สอบถามเรื่อง License/VIP

---

## 💡 สรุป

**ปัญหาหลัก:**
- ❌ Error 10001 มาจากเสี่ยวเหว๋ยโดยตรง (ไม่ใช่ NestJS)
- ❌ Device Online แต่ยังไม่ Authorized
- ❌ Account ยังไม่ Activate หรือ Device ยังไม่ Bind

**วิธีแก้ไข:**
- ✅ Activate Account/VIP ในเสี่ยวเหว๋ย
- ✅ Bind Device กับ Account
- ✅ ตรวจสอบ License ยังไม่หมดอายุ

**NestJS Backend:**
- ✅ ทำงานถูกต้องแล้ว (ไม่ต้องแก้)
- ✅ เป็นแค่ตัวกลางส่งคำสั่ง
- ✅ สิทธิ์ถูกตัดสินที่ software เสี่ยวเหว๋ย
