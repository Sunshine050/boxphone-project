# 📱 การตั้งค่ามือถือสำหรับ BoxPhone (USB Mode)

## ✅ โหมดที่ต้องเปิดในมือถือ

### 1. **Developer Options (Developer Options)**

**วิธีเปิด:**
1. ไปที่ **Settings** → **About phone** (หรือ **About device**)
2. หา **Build number** (หรือ **หมายเลขการสร้าง**)
3. **แตะ 7 ครั้งติดกัน** (จะเห็นข้อความ "You are now a developer!")
4. กลับไปที่ **Settings** → **Developer options** (หรือ **ตัวเลือกสำหรับนักพัฒนา**)

---

### 2. **USB Debugging** ⭐ (สำคัญที่สุด)

**วิธีเปิด:**
1. ไปที่ **Settings** → **Developer options**
2. เปิด **USB debugging** (หรือ **การดีบักผ่าน USB**)
3. จะมี popup ถามยืนยัน → กด **OK** หรือ **Allow**

**หมายเหตุ:** 
- ต้องเปิดโหมดนี้ **ทุกครั้ง** ที่เสียบ USB
- ถ้าเห็น popup "Allow USB debugging?" → กด **Allow** หรือ **อนุญาต**

---

### 3. **Allow USB debugging authorization** (ถ้ามี)

**วิธีเปิด:**
1. ไปที่ **Settings** → **Developer options**
2. เปิด **Allow USB debugging authorization** (หรือ **อนุญาตการดีบักผ่าน USB**)

**หมายเหตุ:** 
- บางเครื่องอาจไม่มีตัวเลือกนี้
- ถ้ามี แนะนำให้เปิดไว้

---

### 4. **Stay awake** (แนะนำ - ไม่บังคับ)

**วิธีเปิด:**
1. ไปที่ **Settings** → **Developer options**
2. เปิด **Stay awake** (หรือ **เปิดหน้าจอทิ้งไว้**)

**ประโยชน์:**
- ป้องกันหน้าจอดับระหว่างใช้งาน
- ทำให้การดึงภาพหน้าจอเสถียรขึ้น

---

### 5. **สำหรับ Huawei/Honor เพิ่มเติม:**

**ต้องเปิด:**
- ✅ **Allow HiSuite to use HDB**
- ✅ **USB debugging**
- ✅ **Allow USB debugging authorization**

---

## 📋 Checklist สรุป

### ✅ โหมดที่ต้องเปิด (บังคับ):

- [ ] **Developer Options** - เปิดแล้ว (แตะ Build number 7 ครั้ง)
- [ ] **USB debugging** - เปิด
- [ ] **Allow USB debugging authorization** - เปิด (ถ้ามี)

### ⭐ โหมดที่แนะนำให้เปิด (ไม่บังคับ):

- [ ] **Stay awake** - เปิด (ป้องกันหน้าจอดับ)
- [ ] **Allow overlay display on "Settings"** - เปิด (ถ้าจำเป็น)
- [ ] **Allow running Mock Modem service** - เปิด (ถ้าจำเป็น)

---

## 🔍 วิธีตรวจสอบว่าตั้งค่าถูกต้อง

### 1. ตรวจสอบด้วย ADB:

```bash
adb devices
```

**ผลลัพธ์ที่ควรเห็น:**
```
List of devices attached
ABC123XYZ    device
```

**ถ้าเห็น `unauthorized`:**
- ดูที่หน้าจอมือถือ จะมี popup ถาม "Allow USB debugging?"
- กด **Allow** หรือ **อนุญาต**

**ถ้าเห็น `offline`:**
- ลองถอดและเสียบ USB ใหม่
- หรือรัน `adb kill-server` แล้วรัน `adb devices` ใหม่

---

### 2. ตรวจสอบในมือถือ:

1. ไปที่ **Settings** → **Developer options**
2. เช็คว่า:
   - ✅ **USB debugging** = เปิด (ON)
   - ✅ **Developer options** = เปิด (ON)

---

## ⚠️ ปัญหาที่อาจเจอ

### ปัญหา: ไม่เห็น "Developer options" ใน Settings

**วิธีแก้:**
- ไปที่ **Settings** → **About phone**
- แตะ **Build number** 7 ครั้งติดกัน
- กลับไปที่ **Settings** → ควรเห็น **Developer options** แล้ว

### ปัญหา: USB debugging เปิดไม่ได้

**วิธีแก้:**
1. เช็คว่าเปิด **Developer options** แล้วหรือยัง
2. ลองรีสตาร์ทมือถือ
3. ลองถอดและเสียบ USB ใหม่

### ปัญหา: `adb devices` แสดง `unauthorized`

**วิธีแก้:**
1. ดูที่หน้าจอมือถือ จะมี popup ถาม "Allow USB debugging?"
2. กด **Allow** หรือ **อนุญาต**
3. เลือก **Always allow from this computer** (ถ้ามี) เพื่อไม่ต้องถามอีก
4. รัน `adb devices` อีกครั้ง

### ปัญหา: หน้าจอดับระหว่างใช้งาน

**วิธีแก้:**
- เปิด **Stay awake** ใน Developer options
- หรือตั้งค่า Screen timeout เป็น "Never" หรือ "30 minutes"

---

## 📝 สรุป

### โหมดที่ต้องเปิด (บังคับ):
1. ✅ **Developer Options** - แตะ Build number 7 ครั้ง
2. ✅ **USB debugging** - เปิด
3. ✅ **Allow USB debugging authorization** - เปิด (ถ้ามี)

### โหมดที่แนะนำ (ไม่บังคับ):
4. ⭐ **Stay awake** - เปิด (ป้องกันหน้าจอดับ)

---

## 🎯 Quick Setup

1. **Settings** → **About phone** → แตะ **Build number** 7 ครั้ง
2. **Settings** → **Developer options** → เปิด **USB debugging**
3. **Settings** → **Developer options** → เปิด **Stay awake** (แนะนำ)
4. เสียบ USB → กด **Allow** เมื่อมี popup ถาม
5. รัน `adb devices` เพื่อตรวจสอบ

---

**หมายเหตุ:** 
- การตั้งค่าเหล่านี้จะถูกเก็บไว้จนกว่าจะปิด Developer options
- ถ้า reset factory settings จะต้องตั้งค่าใหม่ทั้งหมด
