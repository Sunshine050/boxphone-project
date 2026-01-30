# คู่มือหาปุ่ม API Server ในเสี่ยวเหว๋ย

## 📍 ตำแหน่งปุ่ม API Server

### วิธีที่ 1: ดูที่ Right Panel (แนะนำ)

**ตำแหน่ง:**
- ดูที่ **Right Panel (ด้านขวา)** ของเสี่ยวเหว๋ย
- **ไม่ใช่ใน Settings** ที่เห็นในภาพ

**ขั้นตอน:**
1. **ดูที่ Right Panel (ด้านขวา)** ของหน้าจอเสี่ยวเหว๋ย
2. **หาข้อความ "Login to use the VIP version!"**
3. **กดปุ่ม "API" ที่อยู่ข้างๆ** ข้อความนั้น

**ลักษณะ:**
- ปุ่ม "API" อาจเป็นปุ่มสีเขียวหรือสีอื่น
- อาจมีข้อความ "API Server" หรือ "HTTP API"
- อาจมี status indicator (Running/Stopped)

---

### วิธีที่ 2: ดูใน Settings อื่นๆ

**ถ้าไม่เจอที่ Right Panel:**

1. **ลองดูใน "Production Team"** (ใน Settings ที่เห็น)
   - อาจมีหัวข้อ "API Server" หรือ "HTTP API"
   - หรือ "API Settings"

2. **ลองดูในเมนูอื่นๆ**
   - อาจมีเมนู "Network", "Server", หรือ "API"
   - หรือ "Advanced Settings"

3. **ลองดูในเมนูหลัก**
   - อาจมีปุ่ม "API" ที่เมนูหลัก
   - หรือ "Settings" → "API"

---

### วิธีที่ 3: ดูในเมนูหลัก

**ตำแหน่ง:**
- ดูที่ **เมนูหลัก** ของเสี่ยวเหว๋ย (ไม่ใช่ Settings)

**ขั้นตอน:**
1. **ดูที่เมนูหลัก** (อาจอยู่ด้านบนหรือด้านข้าง)
2. **หาปุ่ม "API" หรือ "API Server"**
3. **หรือ "Settings" → "API" หรือ "Server"**

---

## 🔍 วิธีตรวจสอบว่า API Server เปิดอยู่หรือไม่

### วิธีที่ 1: ดูในเสี่ยวเหว๋ย

- ดูว่ามีข้อความแสดงว่า **"API Server: Running"** หรือ **"HTTP API: Active"**
- หรือดูที่ status indicator (ถ้ามี)
- หรือดูที่ Right Panel ว่ามี status แสดง

### วิธีที่ 2: ทดสอบด้วย Command Line

```powershell
# ตรวจสอบ port 8080
netstat -ano | findstr :8080

# หรือทดสอบด้วย curl
curl http://localhost:8080/api/devices
```

**ผลลัพธ์:**
- ✅ **มี output** = API Server เปิดอยู่
- ❌ **ไม่มี output** หรือ **Connection refused** = API Server ยังไม่เปิด

### วิธีที่ 3: ทดสอบด้วย Browser

เปิดเบราว์เซอร์ไปที่:
- `http://localhost:8080/api/devices`
- `http://localhost:8080/api/health`

**ผลลัพธ์:**
- ✅ **แสดง JSON หรือข้อมูล** = API Server เปิดอยู่
- ❌ **Connection refused** = API Server ยังไม่เปิด

---

## 💡 Tips

- **ปุ่ม API อาจอยู่ที่ Right Panel** ไม่ใช่ใน Settings
- **หรืออาจอยู่ในเมนูอื่นๆ** ที่ยังไม่ได้เปิด
- **ลองดูที่เมนูหลัก** หรือ toolbar
- **หรือลองกดปุ่มต่างๆ** เพื่อหาหน้า API Settings

---

## 📝 ขั้นตอนสรุป

1. ✅ **ดูที่ Right Panel (ด้านขวา)** - หาข้อความ "Login to use the VIP version!" → กดปุ่ม "API"
2. ✅ **ถ้าไม่เจอ** → ลองดูใน "Production Team" หรือเมนูอื่นๆ ใน Settings
3. ✅ **ถ้ายังไม่เจอ** → ลองดูที่เมนูหลักหรือ toolbar
4. ✅ **ทดสอบว่า API Server เปิดอยู่** (ด้วย curl หรือ browser)
5. ✅ **ถ้าเปิดแล้ว** → ทดสอบ Sync จากเสี่ยวเหว๋ยใน Admin Panel

---

## 🔗 ลิงก์ที่เกี่ยวข้อง

- เสี่ยวเหว๋ย Website: https://www.xiaowei.xin/
- เอกสาร API: https://www.xiaowei.xin/help/70/349

---

## ❓ ถ้ายังไม่เจอ?

1. **ลองดูที่ Right Panel** (ด้านขวา) - อาจมีปุ่ม "API" อยู่
2. **ลองดูในเมนูอื่นๆ** - อาจอยู่ในเมนูที่ยังไม่ได้เปิด
3. **ลองกดปุ่มต่างๆ** เพื่อหาหน้า API Settings
4. **ติดต่อเสี่ยวเหว๋ย Support** เพื่อสอบถามเรื่อง:
   - ตำแหน่งปุ่ม API Server
   - วิธีเปิด HTTP API Server
   - วิธีใช้ API โดยไม่ต้อง VIP
