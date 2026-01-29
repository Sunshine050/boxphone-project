# คู่มือการเชื่อมต่อเสี่ยวเหว๋ย (Xiaowei) สำหรับโปรเจกต์ BoxPhone

## 📋 ภาพรวม

โปรเจกต์ BoxPhone รองรับการเชื่อมต่อ Android ได้ 2 วิธี:

1. **Android Agent (Kotlin App)** - เชื่อมต่อผ่าน Network (แนะนำ)
2. **เสี่ยวเหว๋ย (Xiaowei)** - เชื่อมต่อผ่าน USB หรือ WiFi

---

## 🔌 วิธีที่ 1: ใช้ Android Agent (Kotlin) - ไม่ต้องเสียบ USB

### ขั้นตอนการเชื่อมต่อ:

1. **เปิด Android Studio**
2. **Open Project** ไปที่โฟลเดอร์ `android-agent`
3. **แก้ไข IP Address** ในไฟล์ `SocketManager.kt` หรือ `MainActivity.kt`:
   ```kotlin
   // เปลี่ยน IP เป็น IP ภายใน LAN ของเครื่อง Server
   SocketManager.instance.connect("http://192.168.1.xxx:3001")
   ```
   ⚠️ **สำคัญ:** อย่าใช้ `localhost` หรือ `127.0.0.1` บนมือถือ

4. **Run App** ลงเครื่อง Android จริง
5. **เปิดใช้งาน Accessibility Service** ในมือถือ (ตามที่แอปขอ)

### ข้อดี:
- ✅ ไม่ต้องเสียบ USB
- ✅ เชื่อมต่อผ่าน WiFi ได้
- ✅ ใช้งานได้หลายเครื่องพร้อมกัน
- ✅ ไม่ต้องเปิด USB Debugging

---

## 📱 วิธีที่ 2: ใช้เสี่ยวเหว๋ย (Xiaowei) - ต้องเสียบ USB

### ขั้นตอนการเชื่อมต่อ:

#### 1. **เปิด USB Debugging บนมือถือ**

ตามคู่มือ: https://www.xiaowei.xin/help/70/4

**สำหรับ Android ทั่วไป:**
1. ไปที่ **Settings** → **About phone**
2. แตะ **Build number** 7 ครั้ง (เพื่อเปิด Developer options)
3. กลับไปที่ **Settings** → **Developer options**
4. เปิด **USB debugging**
5. เปิด **Allow USB debugging authorization** (ถ้ามี)

**สำหรับ Huawei/Honor:**
- ต้องเปิด **Allow HiSuite to use HDB** เพิ่มเติม
- ดูรายละเอียดเพิ่มเติม: https://www.xiaowei.xin/help/70/4

#### 2. **เสียบ USB เข้ากับคอมพิวเตอร์**

- ใช้สาย USB ที่รองรับการถ่ายโอนข้อมูล (ไม่ใช่สายชาร์จอย่างเดียว)
- เมื่อเสียบ USB แล้ว มือถือจะถาม "Allow USB debugging?" → กด **Allow**

#### 3. **เปิดโปรแกรมเสี่ยวเหว๋ย**

- เปิดโปรแกรม **เสี่ยวเหว๋ย** บนคอมพิวเตอร์
- โปรแกรมจะตรวจจับมือถือที่เสียบ USB อัตโนมัติ
- เลือกมือถือที่ต้องการเชื่อมต่อ

#### 4. **ตั้งค่าเพิ่มเติม (ถ้าจำเป็น)**

ในมือถือ ไปที่ **Settings** → **Developer options**:
- ✅ **USB debugging** - เปิด
- ✅ **Allow overlay display on "Settings"** - เปิด (ถ้าจำเป็น)
- ✅ **Allow running Mock Modem service** - เปิด (ถ้าจำเป็น)

### ข้อดี:
- ✅ ภาพชัดและเสถียร (เชื่อมต่อผ่าน USB)
- ✅ ไม่ต้องติดตั้งแอปบนมือถือ
- ✅ ใช้งานได้ทันที

### ข้อเสีย:
- ❌ ต้องเสียบ USB ตลอดเวลา
- ❌ ต้องเปิด USB Debugging (อาจมีปัญหาเรื่องความปลอดภัย)
- ❌ ใช้งานได้ทีละเครื่องต่อคอมพิวเตอร์ 1 เครื่อง

---

## 🌐 วิธีที่ 3: ใช้เสี่ยวเหว๋ยผ่าน WiFi (ไม่ต้องเสียบ USB)

### ขั้นตอนการเชื่อมต่อ:

1. **เชื่อมต่อเสี่ยวเหว๋ยผ่าน USB ก่อน** (ครั้งแรก)
2. **เปิด Wireless Debugging** ในมือถือ:
   - ไปที่ **Settings** → **Developer options**
   - เปิด **Wireless debugging**
3. **เชื่อมต่อผ่าน WiFi** ในโปรแกรมเสี่ยวเหว๋ย
4. **ถอด USB** ได้ (หลังจากเชื่อมต่อ WiFi สำเร็จ)

---

## 🔧 การแก้ไขปัญหา

### ปัญหา: มือถือไม่แสดงในเสี่ยวเหว๋ย

**วิธีแก้:**
1. เช็คว่าเปิด **USB debugging** แล้วหรือยัง
2. เช็คสาย USB (ลองเปลี่ยนสายดู)
3. เช็คไดรเวอร์ USB บนคอมพิวเตอร์
4. สำหรับ Huawei/Honor: เปิด **Allow HiSuite to use HDB**

### ปัญหา: USB connection ไม่เสถียร

**วิธีแก้:**
1. เปลี่ยนสาย USB
2. เช็คพอร์ต USB (ลองเปลี่ยนพอร์ต)
3. ใช้ Wireless Debugging แทน

### ปัญหา: ไม่สามารถควบคุมมือถือได้

**วิธีแก้:**
1. เช็คว่าเปิด **USB debugging** แล้ว
2. เช็คว่าเปิด **Allow USB debugging authorization** แล้ว
3. ลอง **Revoke USB debugging authorization** แล้วเชื่อมต่อใหม่

---

## 📝 สรุป

### สำหรับโปรเจกต์ BoxPhone:

**แนะนำ:** ใช้ **Android Agent (Kotlin)** เพราะ:
- ไม่ต้องเสียบ USB
- รองรับหลายเครื่องพร้อมกัน
- ใช้งานง่ายกว่า

**ถ้าต้องการใช้เสี่ยวเหว๋ยผ่าน USB:**
- ต้องเสียบ USB และเปิด USB Debugging
- เหมาะสำหรับการทดสอบหรือใช้งานเครื่องเดียว
- ใช้ **USB Bridge Service** (`tools/usb-bridge.js`) เพื่อเชื่อมต่อกับ Backend
- ดูคู่มือเพิ่มเติม: https://www.xiaowei.xin/help/70/4

---

## 🚀 วิธีใช้งาน USB Bridge Service

### ขั้นตอนการใช้งาน:

1. **ติดตั้ง ADB (Android Debug Bridge)**
   ```bash
   # Windows: ดาวน์โหลดจาก https://developer.android.com/studio/releases/platform-tools
   # หรือติดตั้งผ่าน Android Studio SDK Manager
   ```

2. **เปิด USB Debugging บนมือถือ**
   - Settings → About phone → แตะ "Build number" 7 ครั้ง
   - Settings → Developer options → เปิด "USB debugging"
   - เปิด "Allow USB debugging authorization"

3. **เสียบ USB** เข้ากับคอมพิวเตอร์

4. **ตรวจสอบการเชื่อมต่อ:**
   ```bash
   adb devices
   ```
   ควรเห็นอุปกรณ์แสดงในรายการ (เช่น: `abc123    device`)

5. **รัน USB Bridge Service:**
   ```bash
   # จากโฟลเดอร์ root ของโปรเจกต์
   npm run usb-bridge
   
   # หรือ
   node tools/usb-bridge.js
   ```

6. **ตั้งค่า Environment Variables (ถ้าต้องการ):**
   ```bash
   # Windows (PowerShell)
   $env:BACKEND_URL="http://localhost:3001"
   $env:DEVICE_ID="usb_device_1"
   $env:STREAM_FPS="5"
   npm run usb-bridge
   
   # Linux/Mac
   BACKEND_URL=http://localhost:3001 DEVICE_ID=usb_device_1 STREAM_FPS=5 npm run usb-bridge
   ```

### Environment Variables:

- `BACKEND_URL`: URL ของ Backend Server (default: `http://localhost:3001`)
- `DEVICE_ID`: ID ของอุปกรณ์ (default: `usb_device_{timestamp}`)
- `STREAM_FPS`: ความเร็วในการส่งภาพหน้าจอ (default: `5` FPS)

### การทำงาน:

- ✅ USB Bridge จะเชื่อมต่อกับ Backend ผ่าน Socket.IO
- ✅ ส่งภาพหน้าจอจากมือถือไปยัง Backend แบบเรียลไทม์
- ✅ รับคำสั่งควบคุม (click, swipe, type) จาก Backend
- ✅ ใช้ ADB เพื่อดึงภาพหน้าจอและส่งคำสั่งควบคุม

### การแก้ไขปัญหา:

**ปัญหา: `adb devices` ไม่แสดงอุปกรณ์**
- เช็คว่าเปิด USB Debugging แล้วหรือยัง
- เช็คสาย USB (ลองเปลี่ยนสายดู)
- เช็คว่าได้ authorize USB debugging บนมือถือแล้วหรือยัง

**ปัญหา: USB Bridge ไม่สามารถเชื่อมต่อกับ Backend ได้**
- เช็คว่า Backend กำลังรันอยู่ที่ `http://localhost:3001`
- เช็ค firewall หรือ network settings

**ปัญหา: ภาพหน้าจอไม่แสดง**
- เช็คว่า USB Bridge กำลังรันอยู่
- เช็ค console logs เพื่อดู error messages
- ลองลด `STREAM_FPS` ลง (เช่น `3` แทน `5`)

---

## 🔗 ลิงก์ที่เกี่ยวข้อง

- คู่มือเสี่ยวเหว๋ย: https://www.xiaowei.xin/help/70/4
- โปรเจกต์ BoxPhone: ดู `README.md`
