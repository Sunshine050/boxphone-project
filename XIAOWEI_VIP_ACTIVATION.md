# คู่มือเปิดใช้งาน VIP/Membership ในเสี่ยวเหว๋ย

## ❌ ปัญหา: "请激活会员后使用" (Please activate membership to use)

เมื่อเรียกใช้เสี่ยวเหว๋ย WebSocket API จะได้รับ error:
```json
{"code":10001,"message":"请激活会员后使用","data":null}
```

**หมายความว่า:** เสี่ยวเหว๋ยต้องการให้ **เปิดใช้งานสมาชิก/VIP** ก่อนใช้งาน API

---

## ✅ วิธีแก้ไข

### วิธีที่ 1: เปิดใช้งาน VIP ในเสี่ยวเหว๋ย Application

1. **เปิดเสี่ยวเหว๋ย Application**
   - เปิดโปรแกรมเสี่ยวเหว๋ย (Xiaowei) ที่ติดตั้งไว้

2. **Login หรือ Activate VIP**
   - ดูที่ Right Panel (ด้านขวา)
   - หาข้อความ "Login to use the VIP version!"
   - **กดปุ่ม "Login" หรือ "VIP"** เพื่อ login หรือ activate VIP
   - หรือไปที่ Settings → Account → Login/Activate VIP

3. **ตรวจสอบว่า VIP เปิดใช้งานแล้ว**
   - ดูว่า status เป็น "VIP Active" หรือ "会员已激活"
   - หรือดูว่าไม่มีข้อความ "请激活会员后使用" แล้ว

4. **Restart เสี่ยวเหว๋ย (ถ้าจำเป็น)**
   - ปิดและเปิดเสี่ยวเหว๋ยใหม่
   - ตรวจสอบว่า WebSocket Server ยังเปิดอยู่ (port 22222)

### วิธีที่ 2: ใช้ HTTP API แทน (ถ้ามี)

ถ้า HTTP API ไม่ต้องการ VIP:
- ระบบจะ fallback ไปใช้ HTTP API อัตโนมัติ
- ตรวจสอบว่า `XIAOWEI_API_URL` ตั้งค่าถูกต้องใน `backend/.env`

---

## 🔍 ตรวจสอบว่า VIP เปิดใช้งานแล้วหรือไม่

### วิธีที่ 1: ทดสอบด้วย WebSocket Tool

1. เปิด https://wstool.js.org/
2. ใส่ `ws://127.0.0.1:22222/`
3. กด "เริ่มการเชื่อมต่อ"
4. ส่ง request:
   ```json
   {
     "action": "getDeviceList",
     "device": "all",
     "data": {}
   }
   ```
5. **ถ้าได้ response:**
   ```json
   {"code":10000,"message":"SUCCESS","data":[...]}
   ```
   = **VIP เปิดใช้งานแล้ว** ✅

6. **ถ้าได้ response:**
   ```json
   {"code":10001,"message":"请激活会员后使用","data":null}
   ```
   = **ยังไม่ได้ activate VIP** ❌

### วิธีที่ 2: ดูใน Backend Logs

เมื่อเรียกใช้ Sync จากเสี่ยวเหว๋ย:
- **ถ้าได้ devices** = VIP เปิดใช้งานแล้ว ✅
- **ถ้าได้ error "请激活会员后使用"** = ยังไม่ได้ activate VIP ❌

---

## 📝 ขั้นตอนสรุป

1. ✅ **เปิดเสี่ยวเหว๋ย Application**
2. ✅ **Login หรือ Activate VIP** (กดปุ่ม "Login" หรือ "VIP")
3. ✅ **ตรวจสอบว่า VIP เปิดใช้งานแล้ว** (ดู status หรือทดสอบด้วย WebSocket)
4. ✅ **Restart เสี่ยวเหว๋ย** (ถ้าจำเป็น)
5. ✅ **Restart Backend** (ถ้าจำเป็น)
6. ✅ **ทดสอบ Sync จากเสี่ยวเหว๋ยใน Admin Panel**

---

## 💡 Tips

- **Free Edition** อาจมีข้อจำกัด - ถ้าใช้ไม่ได้อาจต้องอัปเกรดเป็น VIP
- **WebSocket API** ต้องการ VIP - แต่ HTTP API อาจไม่ต้องการ
- **Login** อาจต้องใช้ account จากเสี่ยวเหว๋ย - ดูที่เว็บไซต์ https://www.xiaowei.xin/
- **VIP Activation** อาจต้องชำระเงินหรือใช้ trial version

---

## 🔗 ลิงก์ที่เกี่ยวข้อง

- เสี่ยวเหว๋ย Website: https://www.xiaowei.xin/
- เอกสาร API: https://www.xiaowei.xin/help/70/349
- WebSocket Testing Tool: https://wstool.js.org/

---

## ❓ ถ้ายังไม่ได้?

1. **ตรวจสอบว่าเสี่ยวเหว๋ยติดตั้งและเปิดอยู่**
2. **ตรวจสอบว่า WebSocket Server เปิดอยู่** (port 22222)
3. **ลองใช้ HTTP API แทน** (ถ้ามี)
4. **ติดต่อเสี่ยวเหว๋ย Support** เพื่อสอบถามเรื่อง VIP activation
