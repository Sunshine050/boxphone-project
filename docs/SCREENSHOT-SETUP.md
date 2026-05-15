# คู่มือการตั้งค่า Screenshot (ดึงภาพหน้าจอเครื่อง Android)

> **สำคัญ ห้ามลบ** — เอกสารนี้เป็นคู่มือสำหรับการตั้งค่าให้ระบบดึงภาพหน้าจอจากเครื่อง Android ได้สำเร็จ และใช้สำหรับการ deploy / ส่งมอบ / ติดตั้งให้ลูกค้า

---

## 1. สรุปการทำงาน

- **ภาพหน้าจอ** ดึงผ่าน **ADB** โดยตรง (ไม่ใช้ Xiaowei HTTP/WebSocket สำหรับ screenshot)
- Xiaowei ใช้เฉพาะ **sync รายการเครื่อง** และ monitor/control
- Flow: **Frontend → Backend (NestJS) → ADB screencap → เครื่อง Android (ต่อ USB)**

---

## 2. สิ่งที่ต้องมีก่อนเริ่ม

- เครื่อง Android เปิด **USB Debugging** และต่อกับเครื่องที่รัน Backend ผ่าน **USB**
- ติดตั้ง **ADB** (Android Debug Bridge) บนเครื่องที่รัน Backend
- Backend รันบน **เครื่องเดียวกัน** กับที่ต่อ USB (หรือใช้ USB over IP / ADB over TCP ถ้าเป็นกรณี remote)

---

## 3. ขั้นตอนตั้งค่า (ทำตามลำดับ)

### 3.1 ติดตั้ง ADB

**Windows**

- ดาวน์โหลด [Android Platform Tools](https://developer.android.com/studio/releases/platform-tools) (ไฟล์ zip)
- แตกไฟล์ แล้วใส่ path โฟลเดอร์ `platform-tools` ในตัวแปรสภาพ **PATH**
- หรือจำ path เต็มไปที่ `adb.exe` (เช่น `C:\platform-tools\adb.exe`) ไว้ใส่ใน `.env` ในขั้นตอนถัดไป

**Linux (Ubuntu/Debian)**

```bash
sudo apt update
sudo apt install android-tools-adb
```

**macOS**

```bash
brew install android-platform-tools
```

### 3.2 ตรวจสอบว่า ADB ใช้ได้

เปิดเทอร์มินัลแล้วรัน:

```bash
adb devices
```

ต้องเห็นรายการเครื่อง (serial number) และสถานะ `device` เช่น:

```
List of devices attached
5931563651483498    device
39595a4144363498    device
```

ถ้าเห็น `unauthorized` ให้ไปกด "อนุญาต" บนหน้าจอมือถือที่ถาม USB debugging.

### 3.3 ทดสอบดึงภาพหนึ่งเครื่อง

ใช้ serial จาก `adb devices` แทน `<serial>`:

```bash
adb -s <serial> exec-out screencap -p > test.png
```

เปิดไฟล์ `test.png` ถ้าเห็นภาพหน้าจอมือถือ แปลว่า pipeline ใช้ได้ และ Backend จะดึงภาพแบบเดียวกันได้

### 3.4 ตั้งค่า Backend (.env)

ในโฟลเดอร์ **backend** แก้ไขไฟล์ **`.env`**:

| ตัวแปร | ความหมาย | ตัวอย่าง |
|--------|----------|----------|
| `ADB_PATH` | (ถ้าจำเป็น) path เต็มไปที่ `adb` หรือ `adb.exe` | `C:\platform-tools\adb.exe` หรือ `/usr/bin/adb` |
| `SCREENSHOT_CACHE_TTL_MS` | (ไม่บังคับ) cache ภาพกี่มิลลิวินาที | `8000` (8 วินาที) |
| `SCREENSHOT_MAX_CONCURRENT` | (ไม่บังคับ) ดึงภาพพร้อมกันสูงสุดกี่เครื่อง | `2` หรือ `4` |

- ถ้าในเทอร์มินัลรัน `adb` ได้โดยไม่ต้องใส่ path ไม่ต้องตั้ง `ADB_PATH`
- ถ้ารัน Backend แล้วหา `adb` ไม่เจอ (เช่น รันจาก IDE/Service) ให้ตั้ง `ADB_PATH` เป็น path เต็ม

### 3.5 Serial ต้องตรงกับ adb devices

- เครื่องที่ต้องการดึงภาพต้องมี **serial_number ในฐานข้อมูล** ตรงกับที่ `adb devices` แสดง
- ถ้า sync จาก Xiaowei แล้ว serial ตรงกับ `adb devices` อยู่แล้ว ไม่ต้องแก้
- ถ้าไม่ตรง ต้องแก้ใน DB หรือ sync ใหม่ให้ได้ serial ที่ตรงกับ `adb devices`

### 3.6 รัน Backend และทดสอบ

```bash
cd backend
npm run start:dev
```

จากนั้นเปิด Admin (Frontend) → หน้า Overview หรือ Available devices  
ควรเห็นภาพหน้าจอของเครื่องที่ต่อ USB และ serial ตรงกับในระบบ

---

## 4. Production / Deploy / ส่งมอบลูกค้า

- **ไม่ใช่ hardcode** — ค่าที่เกี่ยวกับ path และพฤติกรรม screenshot ตั้งใน `.env` ทั้งหมด
- **Checklist ติดตั้งที่ลูกค้า:**
  1. ติดตั้ง ADB บน server ตาม 3.1
  2. ต่อ USB devices และตรวจ `adb devices` ตาม 3.2
  3. (ถ้าจำเป็น) ตั้ง `ADB_PATH` ใน `.env` ตาม 3.4
  4. รัน Backend (และ Frontend) ตามปกติ
  5. ตรวจสอบว่า serial ในระบบตรงกับ `adb devices`

---

## 5. ปัญหาที่พบบ่อย

| อาการ | สาเหตุที่อาจเป็น | วิธีแก้ |
|--------|-------------------|--------|
| ภาพไม่ขึ้น / ไม่สามารถดึงหน้าจอได้ | ADB ไม่เจอ หรือ serial ไม่ตรง | ตั้ง `ADB_PATH` ใน `.env` และตรวจ `adb devices` กับ serial ใน DB |
| ช้ามาก | ดึงหลายเครื่องพร้อมกัน / ไม่มี cache | ใช้ค่า `SCREENSHOT_MAX_CONCURRENT` และ `SCREENSHOT_CACHE_TTL_MS` ใน `.env` (มีอยู่แล้วในโปรเจกต์) |
| รอบแรกช้า รอบถัดไปเร็ว | ปกติ | มี cache ตาม TTL; จะเร็วภายในช่วง cache |

---

## 6. หมายเหตุสำหรับ Maintainer

- ไฟล์ที่เกี่ยวข้องกับ logic screenshot หลัก:
  - **Backend:** `backend/src/modules/devices/devices.controller.ts`  
    - `fetchScreenshotForSerial`, `screenshotViaAdb`, cache และ concurrency
  - **Config:** `backend/.env` — `ADB_PATH`, `SCREENSHOT_CACHE_TTL_MS`, `SCREENSHOT_MAX_CONCURRENT`
- การเปลี่ยนวิธีดึงภาพ (เช่น ใช้ Xiaowei API ถ้ามีในอนาคต) ควรทำใน controller ส่วนนี้และอัปเดตคู่มือนี้

---

**สำคัญ ห้ามลบ** — คู่มือนี้ใช้สำหรับการตั้งค่าและส่งมอบระบบให้ทำงานได้ถูกต้อง
