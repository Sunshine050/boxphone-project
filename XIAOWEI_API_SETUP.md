# คู่มือเปิด API Server ในเสี่ยวเหว๋ย

## 📍 ตำแหน่งปุ่ม API

จากภาพที่เห็นในเสี่ยวเหว๋ย:

### วิธีที่ 1: กดปุ่ม "API" (แนะนำ)

1. **ดูที่ Right Panel (ด้านขวา)**
2. **หาข้อความ "Login to use the VIP version!"**
3. **กดปุ่ม "API" ที่อยู่ข้างๆ**

### วิธีที่ 2: ดูใน Settings

1. **กดปุ่ม "settings"** (ใน grid ของ action buttons)
2. **หาหัวข้อ "API Server" หรือ "HTTP API"**
3. **เปิด/Enable API Server**

---

## 🔍 ตรวจสอบว่า API Server เปิดอยู่หรือไม่

### วิธีที่ 1: ดูในเสี่ยวเหว๋ย

- ดูว่ามีข้อความแสดงว่า "API Server: Running" หรือ "HTTP API: Active"
- หรือดูที่ status indicator (ถ้ามี)

### วิธีที่ 2: ทดสอบด้วย Command Line

**Windows (PowerShell):**
```powershell
# ตรวจสอบ port 8080
netstat -ano | findstr :8080

# หรือทดสอบด้วย curl
curl http://localhost:8080/api/devices
```

**ผลลัพธ์:**
- **มี output** = API Server เปิดอยู่
- **ไม่มี output** หรือ **Connection refused** = API Server ยังไม่เปิด

### วิธีที่ 3: ทดสอบด้วย Browser

เปิดเบราว์เซอร์ไปที่:
- `http://localhost:8080`
- `http://localhost:8080/api/devices`
- `http://localhost:8080/api/health`

**ผลลัพธ์:**
- **แสดง JSON หรือข้อมูล** = API Server เปิดอยู่
- **Connection refused** หรือ **ไม่สามารถเข้าถึงได้** = API Server ยังไม่เปิด

---

## ⚙️ ตั้งค่า Port (ถ้าจำเป็น)

### ถ้าเสี่ยวเหว๋ยใช้ port อื่น (ไม่ใช่ 8080)

1. **ดูใน Settings → API Port**
2. **แก้ไข `backend/.env`:**
   ```env
   # ตัวอย่าง: ถ้าเสี่ยวเหว๋ยใช้ port 8888
   XIAOWEI_API_URL=http://localhost:8888
   ```
3. **Restart Backend**

---

## 🧪 ทดสอบ API

### 1. ทดสอบดึงรายการอุปกรณ์

```powershell
curl http://localhost:8080/api/devices
```

**ผลลัพธ์ที่คาดหวัง:**
```json
{
  "code": 10000,
  "message": "SUCCESS",
  "data": [
    {
      "serial": "ea85356a",
      "model": "SM-N960F",
      "name": "Device 01",
      "status": "online"
    }
  ]
}
```

### 2. ทดสอบดึงหน้าจอ

```powershell
curl http://localhost:8080/api/screenshot -X POST -H "Content-Type: application/json" -d "{\"serial\":\"ea85356a\"}" --output screenshot.png
```

**ผลลัพธ์ที่คาดหวัง:**
- ได้ไฟล์ `screenshot.png` (PNG image)

---

## ❌ ถ้ายังไม่ทำงาน

### ปัญหา 1: กดปุ่ม "API" แล้วแต่ยังไม่เปิด

**แก้ไข:**
- ตรวจสอบว่าเสี่ยวเหว๋ยเป็น Free Edition หรือ VIP Edition
- Free Edition อาจมีข้อจำกัดในการใช้ API
- ลองกดปุ่ม "API" อีกครั้ง
- Restart เสี่ยวเหว๋ย

### ปัญหา 2: ไม่เห็นปุ่ม "API"

**แก้ไข:**
- ดูใน Settings → หา "API Server" หรือ "HTTP API"
- หรือดูในเมนูอื่นๆ

### ปัญหา 3: API Server เปิดแล้วแต่ยังเชื่อมต่อไม่ได้

**แก้ไข:**
1. **ตรวจสอบ Firewall:**
   - เปิด Windows Firewall
   - อนุญาตเสี่ยวเหว๋ยผ่าน firewall

2. **ตรวจสอบ Port:**
   - ดูว่า port ถูกใช้โดย service อื่นหรือไม่
   - เปลี่ยน port ในเสี่ยวเหว๋ย

3. **ตรวจสอบ URL:**
   - แก้ไข `XIAOWEI_API_URL` ใน `.env` ให้ตรงกับ port จริง

---

## 📝 ขั้นตอนสรุป

1. ✅ **เปิดเสี่ยวเหว๋ย Application**
2. ✅ **กดปุ่ม "API"** (ข้างข้อความ "Login to use the VIP version!")
3. ✅ **ตรวจสอบว่า API Server เปิดอยู่** (ดู status หรือทดสอบด้วย curl)
4. ✅ **ตรวจสอบ Port** (default: 8080)
5. ✅ **ตั้งค่า `XIAOWEI_API_URL` ใน `backend/.env`**
6. ✅ **Restart Backend**
7. ✅ **ทดสอบ Sync จากเสี่ยวเหว๋ยใน Admin Panel**

---

## 💡 Tips

- **Free Edition** อาจมีข้อจำกัด - ถ้าใช้ไม่ได้อาจต้องอัปเกรดเป็น VIP
- **Port 8080** เป็น default - แต่เสี่ยวเหว๋ยอาจใช้ port อื่น
- **Firewall** อาจ block การเชื่อมต่อ - ต้องอนุญาตเสี่ยวเหว๋ย
- **Restart** เสี่ยวเหว๋ยหลังจากเปิด API Server
