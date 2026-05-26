# BoxPhone — อัปเดตโค้ดบนเครื่องลูกค้า (PM2)

คู่มือนี้สำหรับ **เครื่อง PC ที่ลูกค้ารันระบบจริง** (Windows + PM2 + ADB + เสี่ยวเหว๋ย) — ใช้ตอน **ดึงโค้ดใหม่แล้ว build + restart**

> ติดตั้งครั้งแรก / env / Nginx / โดเมน → อ่าน [DEPLOY.md](./DEPLOY.md) และ [CLIENT-DELIVERY-HANDBOOK.md](./CLIENT-DELIVERY-HANDBOOK.md)  
> ADB / ภาพหน้าจอ → [SCREENSHOT-SETUP.md](./SCREENSHOT-SETUP.md)  
> โหมดสตรีม scrcpy → [SCRCPY-SETUP.md](./SCRCPY-SETUP.md)

---

## 1) สิ่งที่รันบนเครื่องลูกค้า (Production)

| แอป PM2 | โฟลเดอร์ | พอร์ต | หน้าที่ |
|---------|----------|-------|--------|
| `boxphone-backend` | `backend/` | **3031** | API + Socket + ADB/scrcpy |
| `boxphone-admin` | `admin/` | **3000** | เว็บแอดมิน |
| `boxphone-user` | `user/` | **3001** | เว็บลูกค้า (เช่าเครื่อง / สตรีม) |

ไฟล์กำหนด PM2 อยู่ที่ **`ecosystem.config.js`** (รากโปรเจกต์)

```text
boxphone-project/
├── ecosystem.config.js
├── backend/          ← .env (ไม่ commit)
├── admin/            ← .env.local
├── user/             ← .env.local
└── logs/             ← log ของ PM2 (backend-out.log ฯลฯ)
```

---

## 2) สิ่งที่ต้องมีบนเครื่อง

- **Node.js** 18 ขึ้นไป (`node -v`)
- **PM2** ติดตั้ง global (`npm install -g pm2`)
- **Git** สำหรับ `git pull`
- **ADB** จากเสี่ยวเหว๋ย (path ตั้งใน `ecosystem.config.js` → `ADB_PATH`)
- โฟลเดอร์โปรเจกต์ เช่น `C:\boxphone-project` (ตามที่ติดตั้งจริง)

---

## 3) เลือกว่าต้อง build อะไร (สำคัญ)

| สิ่งที่เปลี่ยนในอัปเดต | Build | Restart PM2 |
|----------------------|-------|-------------|
| เฉพาะ UI ลูกค้า (`user/`) | `user` | `boxphone-user` |
| เฉพาะ UI แอดมิน (`admin/`) | `admin` | `boxphone-admin` |
| Backend API / scrcpy / touch / socket | `backend` | `boxphone-backend` |
| ทั้งระบบ / ไม่แน่ใจ | ทั้ง 3 | ทั้ง 3 |

**กฎง่ายๆ**

- แก้หน้าเว็บ / landscape / dashboard → **user** (+ restart `boxphone-user`)
- แก้แอดมินจัดการเครื่อง → **admin** (+ restart `boxphone-admin`)
- แก้สตรีม คลิกไม่ตรง หมุนจอ พัง scrcpy → **backend** (+ restart `boxphone-backend`)
- แก้ `shared/` → มักต้อง build **ทั้ง admin และ user** (บางครั้งรวม backend)

---

## 4) ขั้นตอนอัปเดตมาตรฐาน (Production)

เปิด **PowerShell** หรือ **CMD** แล้วไปที่รากโปรเจกต์ (แก้ path ให้ตรงเครื่องลูกค้า):

```powershell
cd C:\path\to\boxphone-project
```

### 4.1 ดึงโค้ดล่าสุด

```powershell
git pull
```

ถ้ามี conflict ให้แก้ไฟล์ก่อน build — **อย่า** ทับ `.env` / `.env.local` ของลูกค้า

### 4.2 อัปเดตเฉพาะ User (ตัวอย่างที่พบบ่อย)

```powershell
cd user
npm install
npm run build
cd ..
pm2 restart boxphone-user
```

### 4.3 อัปเดตเฉพาะ Admin

```powershell
cd admin
npm install
npm run build
cd ..
pm2 restart boxphone-admin
```

### 4.4 อัปเดต Backend (สตรีม / API)

```powershell
cd backend
npm install
npm run build
cd ..
pm2 restart boxphone-backend
```

ถ้าเปลี่ยนเวอร์ชัน scrcpy server หรือครั้งแรกหลัง clone:

```powershell
node scripts\download-scrcpy-server.js
```

จากนั้น `npm run build` + `pm2 restart boxphone-backend` ตามด้านบน

### 4.5 อัปเดตทั้งระบบ (แนะนำเมื่อ release ใหญ่)

```powershell
cd backend
npm install
npm run build
cd ..\admin
npm install
npm run build
cd ..\user
npm install
npm run build
cd ..
pm2 restart boxphone-backend boxphone-admin boxphone-user
```

หรือ restart ทีละตัวถ้าต้องการลด downtime สั้นๆ:

```powershell
pm2 restart boxphone-backend
pm2 restart boxphone-admin
pm2 restart boxphone-user
```

---

## 5) คำสั่ง PM2 ที่ใช้บ่อย

รันจาก **รากโปรเจกต์** (`ecosystem.config.js` อยู่ที่นี่)

| คำสั่ง | ความหมาย |
|--------|----------|
| `pm2 list` | ดูสถานะทุกแอป (online / errored) |
| `pm2 logs` | ดู log รวมแบบ realtime |
| `pm2 logs boxphone-user --lines 80` | log เฉพาะ user 80 บรรทัดล่าสุด |
| `pm2 logs boxphone-backend --lines 100` | log backend (scrcpy / ADB) |
| `pm2 restart boxphone-user` | รีสตาร์ทหลัง build user |
| `pm2 restart boxphone-backend` | รีสตาร์ทหลัง build backend |
| `pm2 stop boxphone-user` | หยุดชั่วคราว |
| `pm2 start ecosystem.config.js --env production` | เริ่ม production ครั้งแรก (ทั้ง 3 แอป) |
| `pm2 save` | บันทึกให้เปิดเครื่องแล้วขึ้นอัตโนมัติ (หลัง start ครั้งแรก) |
| `pm2 startup` | สร้าง service ตอน boot Windows (รันตามที่ PM2 แนะนำ) |

### เริ่ม production ครั้งแรก (ยังไม่เคยมีใน PM2)

```powershell
cd C:\path\to\boxphone-project
pm2 start ecosystem.config.js --env production
pm2 save
pm2 list
```

### โหลด env ใหม่หลังแก้ `ecosystem.config.js`

```powershell
pm2 reload ecosystem.config.js --env production --update-env
```

---

## 6) ตรวจหลังอัปเดต (Checklist สั้น)

- [ ] `pm2 list` — ทั้ง 3 แอปเป็น **online**
- [ ] เปิดเว็บลูกค้า (พอร์ต 3001 หรือโดเมนจริง) — login ได้
- [ ] เปิดแอดมิน (3000) — login ได้
- [ ] `adb devices` — เห็นเครื่องที่เสียบ USB
- [ ] ทดสอบสตรีม 1 เครื่อง — ภาพขึ้น แตะได้
- [ ] ถ้า backend พัง: `pm2 logs boxphone-backend --err --lines 50`

---

## 7) Build ล้มเหลว / แอปขึ้น errored

| อาการ | แนวทาง |
|--------|--------|
| `npm run build` error ที่ user/admin | ส่งข้อความ error ทั้งก้อนให้ทีม dev; ลอง `npm install` ใหม่ |
| PM2 **errored** ทันทีหลัง restart | `pm2 logs <ชื่อแอป> --err --lines 30` |
| Backend ขึ้นแต่ไม่มีสตรีม | ดู [SCRCPY-SETUP.md](./SCRCPY-SETUP.md), `adb devices`, restart `boxphone-backend` |
| หน้าเว็บเก่า (ไม่เห็น UI ใหม่) | ยืนยันว่า `npm run build` ในโฟลเดอร์ที่ถูก และ `pm2 restart` ชื่อแอปถูก |
| ลูกค้า cache เบราว์เซอร์ | Hard refresh หรือเปิด incognito |

### Rollback โค้ด (git)

```powershell
cd C:\path\to\boxphone-project
git log --oneline -5
git checkout <commit-เก่าที่เสถียร>
# จากนั้น build + pm2 restart ชุดเดิมตามข้อ 4
```

---

## 8) Staging (ถ้าลูกค้ามีรัน parallel)

บาง site รัน **staging** คู่ production (พอร์ต 3032 / 3010 / 3011):

| แอป PM2 | พอร์ต |
|---------|-------|
| `boxphone-backend-staging` | 3032 |
| `boxphone-admin-staging` | 3010 |
| `boxphone-user-staging` | 3011 |

```powershell
pm2 start ecosystem.config.js --only boxphone-backend-staging,boxphone-admin-staging,boxphone-user-staging
pm2 restart boxphone-user-staging
```

รายละเอียด → [SCRCPY-SETUP.md](./SCRCPY-SETUP.md)

---

## 9) ไฟล์ที่ห้ามทับตอน `git pull`

| ไฟล์ | เหตุผล |
|------|--------|
| `backend/.env` | MongoDB, JWT, CORS ของลูกค้า |
| `admin/.env.local` | URL API จริง |
| `user/.env.local` | URL API จริง |
| `logs/*` | log การรัน |

แนะนำสำรองก่อนอัปเดตใหญ่:

```powershell
copy backend\.env backend\.env.backup
copy admin\.env.local admin\.env.local.backup
copy user\.env.local user\.env.local.backup
```

---

## 10) สรุปคำสั่ง copy-paste

**อัปเดต UI ลูกค้าอย่างเดียว**

```powershell
cd C:\path\to\boxphone-project
git pull
cd user && npm install && npm run build && cd ..
pm2 restart boxphone-user
pm2 list
```

**อัปเดต Backend + User (สตรีม / touch)**

```powershell
cd C:\path\to\boxphone-project
git pull
cd backend && npm install && npm run build && cd ..
cd user && npm install && npm run build && cd ..
pm2 restart boxphone-backend boxphone-user
pm2 list
```

**อัปเดตครบทั้งระบบ**

```powershell
cd C:\path\to\boxphone-project
git pull
cd backend && npm install && npm run build && cd ..
cd admin && npm install && npm run build && cd ..
cd user && npm install && npm run build && cd ..
pm2 restart boxphone-backend boxphone-admin boxphone-user
pm2 list
```

---

*อัปเดตตาม `ecosystem.config.js` และสคริปต์ build ใน repo — ถ้าเปลี่ยนชื่อแอป PM2 หรือพอร์ต ให้แก้ไฟล์นี้ด้วย*
