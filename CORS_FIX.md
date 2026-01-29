# 🔧 วิธีแก้ไขปัญหา CORS

## ⚠️ ปัญหา

Backend รันอยู่แล้ว แต่ CORS ยังไม่ทำงาน ทำให้ Frontend ไม่สามารถเรียก API ได้

## ✅ วิธีแก้ไข

### 1. **รีสตาร์ท Backend**

ใน Terminal ที่รัน Backend:
1. กด `Ctrl + C` เพื่อหยุด Backend
2. รอให้หยุดสมบูรณ์
3. รัน `npm run start:dev` ใหม่

**สำคัญ:** ต้องรีสตาร์ท Backend เพื่อให้ CORS config ใหม่มีผล!

---

### 2. **ตรวจสอบว่า Backend รันอยู่จริง**

รันคำสั่งนี้:
```bash
netstat -ano | findstr :3001
```

ควรเห็น process ที่ LISTENING ที่ port 3001

---

### 3. **ทดสอบ CORS**

เปิด Browser Console แล้วลอง login อีกครั้ง

หรือใช้ curl:
```bash
curl -X OPTIONS -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST" -i http://localhost:3001/auth/login
```

ควรเห็น header `Access-Control-Allow-Origin: http://localhost:3000`

---

### 4. **ถ้ายังไม่ได้**

ลองวิธีนี้:

1. **Clear Browser Cache:**
   - กด `Ctrl + Shift + Delete`
   - เลือก "Cached images and files"
   - กด Clear

2. **Hard Refresh:**
   - กด `Ctrl + F5` หรือ `Ctrl + Shift + R`

3. **ตรวจสอบ Backend Logs:**
   - ดูที่ Terminal ที่รัน Backend
   - ควรเห็น request log เมื่อมีการเรียก API

---

## 📝 สรุป

**สาเหตุหลัก:** Backend ยังไม่ได้รีสตาร์ทหลังจากแก้ไข CORS config

**วิธีแก้:** รีสตาร์ท Backend แล้วลอง login อีกครั้ง
