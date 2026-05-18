# BoxPhone — Remote Control Android System

ระบบควบคุมและเช่ามือถือ Android ระยะไกลผ่านเว็บ — ลูกค้าเข้าเว็บได้ทุกที่ มือถือจริงต่อ USB อยู่ที่ร้าน/ออฟฟิศ

> **เอกสารฉบับนี้** ให้ภาพรวมทั้งระบบ + วิธีติดตั้ง + การตั้งค่า env + คำสั่งใช้งานบนเครื่อง server (PM2, deploy, debug)
> เอกสารเฉพาะทางเพิ่มเติมอยู่ในโฟลเดอร์ [`docs/`](./docs)

---

## สารบัญ

1. [ภาพรวมโปรเจกต์](#1-ภาพรวมโปรเจกต์)
2. [สถาปัตยกรรม / องค์ประกอบทั้งระบบ](#2-สถาปัตยกรรม--องค์ประกอบทั้งระบบ)
3. [โครงสร้างโฟลเดอร์ (Monorepo)](#3-โครงสร้างโฟลเดอร์-monorepo)
4. [Tech stack](#4-tech-stack)
5. [Prerequisites — สิ่งที่ต้องติดตั้งก่อน](#5-prerequisites--สิ่งที่ต้องติดตั้งก่อน)
6. [Quick Start — ตั้งโปรเจกต์ครั้งแรก (Developer)](#6-quick-start--ตั้งโปรเจกต์ครั้งแรก-developer)
7. [Environment Variables (ครบทุก service)](#7-environment-variables-ครบทุก-service)
8. [การรันใน Production บนเครื่อง Server (PM2)](#8-การรันใน-production-บนเครื่อง-server-pm2)
9. [Cheat Sheet คำสั่ง PM2 ที่ต้องใช้บนเครื่องลูกค้า](#9-cheat-sheet-คำสั่ง-pm2-ที่ต้องใช้บนเครื่องลูกค้า)
10. [ADB — สำหรับดึงภาพหน้าจอ / ส่ง input](#10-adb--สำหรับดึงภาพหน้าจอ--ส่ง-input)
11. [scrcpy H.264 Streaming (Optional)](#11-scrcpy-h264-streaming-optional)
12. [Cloudflare Tunnel (HTTPS โดยไม่ต้องเปิดพอร์ต)](#12-cloudflare-tunnel-https-โดยไม่ต้องเปิดพอร์ต)
13. [Auto-Start เมื่อเปิดเครื่อง (Windows)](#13-auto-start-เมื่อเปิดเครื่อง-windows)
14. [Workflow ของทีมเมื่อเพิ่มคนใหม่เข้ามาแก้โปรเจกต์](#14-workflow-ของทีมเมื่อเพิ่มคนใหม่เข้ามาแก้โปรเจกต์)
15. [Workflow Deploy / Update โค้ดใหม่ลงเครื่อง Server ลูกค้า](#15-workflow-deploy--update-โค้ดใหม่ลงเครื่อง-server-ลูกค้า)
16. [Troubleshooting รวม](#16-troubleshooting-รวม)
17. [เอกสารอ้างอิงในโปรเจกต์](#17-เอกสารอ้างอิงในโปรเจกต์)

---

## 1. ภาพรวมโปรเจกต์

BoxPhone คือระบบ **“ให้เช่ามือถือ Android ผ่านเว็บ”** เหมาะกับร้านเช่าเครื่องเล่นเกม, ร้านบริการ, ทีม QA, หรือธุรกิจที่ต้องการแชร์มือถือจริงให้ผู้ใช้ปลายทางใช้งานผ่านเบราว์เซอร์

### ใครใช้บ้าง

| ฝ่าย | ใช้อะไร | ทำอะไรได้ |
|------|---------|-----------|
| **แอดมิน / เจ้าของร้าน** | เว็บ Admin (Next.js) | จัดการเครื่อง, จัดการ user, มอบหมายสิทธิ์/เวลา, ดู log, sync เครื่องจาก Xiaowei |
| **ลูกค้า / ผู้ใช้** | เว็บ User (Next.js) | ล็อกอิน → ดูเครื่องที่ตัวเองได้รับ → เห็นหน้าจอเครื่อง → ควบคุม (tap/swipe/พิมพ์) → ระบบนับเวลาให้ |
| **มือถือ Android** | ต่อ USB ที่ร้าน | เป็นเครื่องจริงที่ลูกค้าควบคุม — สั่งงานผ่าน ADB / scrcpy |

### Flow หลัก (ตัวอย่าง: ลูกค้าใช้เครื่อง)

```
[ลูกค้า เบราว์เซอร์]
       │  HTTPS + cookie JWT
       ▼
[Cloudflare Tunnel / Nginx]
       │
       ▼
[Backend NestJS (port 3031)]
       │  ADB command (tap/swipe/screencap) หรือ scrcpy stream
       ▼
[เครื่อง Server PC ที่ต่อ USB กับมือถือ]
       │  USB
       ▼
[มือถือ Android เครื่องจริง]
```

---

## 2. สถาปัตยกรรม / องค์ประกอบทั้งระบบ

| ชั้น | เทคโนโลยี | พอร์ต (default) | หน้าที่ |
|------|-----------|------------------|---------|
| **Backend** | NestJS 10 + Mongoose + Socket.IO | `3031` (prod) / `3032` (staging) | REST API, JWT auth, MongoDB, ADB control, Xiaowei integration, scrcpy stream, Notification socket |
| **Admin** | Next.js 16 + React 19 + Tailwind 4 | `3000` (prod) / `3010` (staging) | Dashboard แอดมิน — จัดการ user/device/log |
| **User** | Next.js 16 + React 19 + Tailwind 4 | `3001` (prod) / `3011` (staging) | Dashboard ลูกค้า — ใช้งานเครื่อง real-time |
| **MongoDB** | Mongo 6.0 (docker / Atlas / local) | `27017` | เก็บ users, devices, sessions, logs |
| **Redis** *(optional, dev)* | Redis 7-alpine | `6379` | จาก `docker-compose.yml` ของ backend (ใช้เมื่อเปิดฟีเจอร์ rate limit/throttle) |
| **Cloudflare Tunnel** | `cloudflared` | – | HTTPS ออกอินเทอร์เน็ตโดยไม่ต้องเปิดพอร์ต / ไม่ต้องมี static IP |
| **ADB** | Android Platform Tools | – | สั่ง `screencap`, `input tap/swipe/text/keyevent` ที่เครื่อง Android |
| **Xiaowei Desktop** *(optional)* | – | `8080` (HTTP) / `22222` (WS) | Sync รายชื่อเครื่องจากซอฟต์แวร์เสี่ยวเหว๋ย |

---

## 3. โครงสร้างโฟลเดอร์ (Monorepo)

```
boxphone-project/
├── backend/                # NestJS API server
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   ├── common/         # filters, interceptors, decorators
│   │   ├── config/         # config schema
│   │   ├── gateway/        # socket adapter
│   │   ├── modules/
│   │   │   ├── auth/       # login, JWT, guards, strategies
│   │   │   ├── users/      # CRUD + admin seed
│   │   │   ├── devices/    # devices, ADB screenshot, scrcpy, Xiaowei WS/HTTP
│   │   │   ├── sessions/   # session timer + cron cleanup
│   │   │   ├── notification/ # Socket.IO realtime
│   │   │   ├── log/        # activity log
│   │   │   └── system/     # health, system info
│   │   └── seed/           # seed-admin
│   ├── assets/             # scrcpy-server.jar
│   ├── docker-compose.yml  # MongoDB + Mongo-Express + Redis (dev)
│   ├── postman_collection.json
│   ├── .env.example
│   └── package.json
│
├── admin/                  # Next.js Admin dashboard
│   ├── app/                # App Router
│   │   ├── admin/          # /admin/users, /admin/devices, /admin/logs, /admin/available
│   │   ├── api/            # API routes (proxy)
│   │   └── login/
│   ├── components/
│   ├── services/           # API client
│   ├── stores/             # zustand
│   ├── proxy.ts            # /api proxy → BACKEND_PROXY_URL
│   └── package.json
│
├── user/                   # Next.js User app
│   ├── app/
│   │   ├── dashboard/
│   │   ├── devices/
│   │   ├── control/        # หน้าควบคุมเครื่อง (มี scrcpy/screenshot stream)
│   │   ├── api/
│   │   └── login/
│   └── package.json
│
├── shared/                 # โค้ดใช้ร่วม admin/user
│   ├── client/             # getApiBaseUrl()
│   ├── server/             # proxy helpers
│   └── scripts/            # next-build filter
│
├── android-agent/          # Android Kotlin app (วิธีเชื่อมต่อแบบ network แทน USB)
│
├── tools/                  # CLI tools
│   ├── usb-bridge.js       # bridge ADB → backend socket
│   ├── emulator-streamer.js
│   └── connect-user-device.js
│
├── scripts/                # Windows deploy / autostart
│   ├── deploy-windows.bat
│   ├── setup-autostart.bat
│   └── download-scrcpy-server.js
│
├── cloudflare/
│   └── config.yml.template # Cloudflare Tunnel config
│
├── docs/                   # คู่มือทั้งหมด (อ่านเพิ่ม)
│   ├── ARCHITECTURE.md
│   ├── DEPLOY.md
│   ├── CLIENT-DELIVERY-HANDBOOK.md
│   ├── SCREENSHOT-SETUP.md
│   ├── SCRCPY-SETUP.md
│   ├── XIAOWEI_*.md
│   └── ...
│
├── ecosystem.config.js     # PM2 config — production + staging
├── package.json            # root: socket-io-client + tools scripts
└── README.md               # ← ไฟล์นี้
```

---

## 4. Tech stack

**Backend**
- NestJS 10, Mongoose 8, Socket.IO 4, JWT, bcrypt, helmet, class-validator
- `@nestjs/throttler` (rate limit), `@nestjs/schedule` (cron)
- `googleapis` (archive log → Google Sheets — optional)
- `ws` (Xiaowei WebSocket), `axios` (Xiaowei HTTP)

**Frontend (admin + user)**
- Next.js 16, React 19, TypeScript 5, Tailwind CSS 4
- shadcn/ui + Radix primitives
- zustand (state), swr (data), socket.io-client
- react-hook-form + zod (form)

**Infra**
- PM2 (process manager)
- Cloudflare Tunnel (HTTPS)
- Docker Compose (dev MongoDB/Redis)
- ADB / scrcpy 2.4 (Android control)

---

## 5. Prerequisites — สิ่งที่ต้องติดตั้งก่อน

### บนเครื่อง dev / server ทุกเครื่อง

| ตัว | เวอร์ชันที่แนะนำ | ตรวจสอบ |
|-----|------------------|---------|
| **Node.js** | **v20 LTS** (อย่างน้อย v18) | `node -v` |
| **npm** | มากับ Node | `npm -v` |
| **Git** | ล่าสุด | `git --version` |
| **PM2** | global (production) | `npm i -g pm2` → `pm2 -v` |

### บนเครื่อง dev (ตอนพัฒนา)

| ตัว | ใช้ทำอะไร |
|-----|-----------|
| **Docker Desktop** | รัน MongoDB + Redis local ผ่าน `docker-compose up -d` |
| **Android Studio** *(optional)* | ถ้าจะแก้ `android-agent/` |

### บนเครื่อง server ที่ลูกค้า (production)

| ตัว | จำเป็น | หมายเหตุ |
|-----|--------|----------|
| **Node.js v20 LTS** | ใช่ | – |
| **PM2** | ใช่ | `npm i -g pm2` |
| **MongoDB** | ใช่ | local mongo หรือ MongoDB Atlas |
| **ADB (Android Platform Tools)** | ใช่ ถ้าใช้ฟีเจอร์ screenshot/control | path อาจอยู่ที่ `C:\Program Files (x86)\xiaowei_android\tools\adb.exe` |
| **Xiaowei Desktop** | ขึ้นกับการใช้งาน | ถ้าจะ sync รายชื่อเครื่อง |
| **cloudflared** | แนะนำ | ทำ HTTPS โดยไม่เปิด port |
| **scrcpy-server.jar** | เฉพาะเมื่อใช้ `STREAMING_MODE=scrcpy` | ดูข้อ [11](#11-scrcpy-h264-streaming-optional) |

---

## 6. Quick Start — ตั้งโปรเจกต์ครั้งแรก (Developer)

### 6.1 Clone + ตั้ง env

```bash
git clone <repo-url> boxphone-project
cd boxphone-project

# ตั้ง env ของแต่ละ service
cp backend/.env.example backend/.env
# แก้ค่าใน backend/.env ตามหัวข้อ "Environment Variables" ด้านล่าง

# admin / user ใช้ .env.local สำหรับ dev
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:3031" > admin/.env.local
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:3031" > user/.env.local
```

### 6.2 รัน MongoDB + Redis (dev)

```bash
cd backend
docker-compose up -d
# ตรวจสอบ
docker ps
```

> ต้องเปิด **Docker Desktop** ก่อน ไม่งั้นจะขึ้น `error during connect...`

### 6.3 ติดตั้ง dependency แต่ละโฟลเดอร์

```bash
# จาก root
cd backend && npm install && cd ..
cd admin   && npm install && cd ..
cd user    && npm install && cd ..
```

### 6.4 รัน dev server (3 terminal)

```bash
# terminal 1 — backend
cd backend && npm run start:dev    # → http://localhost:3031

# terminal 2 — admin
cd admin && npm run dev            # → http://localhost:3000

# terminal 3 — user
cd user && npm run dev             # → http://localhost:3001
```

เปิดเบราว์เซอร์ที่ `http://localhost:3000` (admin) → ล็อกอินด้วย `ADMIN_USERNAME` / `ADMIN_PASSWORD` ที่ตั้งใน `backend/.env`

### 6.5 (Optional) ทดสอบ ADB

```bash
adb devices
# ควรเห็น serial ของมือถือ + สถานะ "device"
```

---

## 7. Environment Variables (ครบทุก service)

> **ห้าม commit ไฟล์ `.env` / `.env.local` / `.env.production` ขึ้น git** — มีอยู่ใน `.gitignore` แล้ว
> ใช้ `.env.example` เป็น template เสมอ

### 7.1 `backend/.env`

ค่าทั้งหมดจากไฟล์ `backend/.env.example`:

#### Server core

| ตัวแปร | บังคับ | Default | คำอธิบาย |
|--------|--------|---------|----------|
| `NODE_ENV` | แนะนำ | `development` | `production` จะเปิด cookie Secure, CORS เข้ม |
| `PORT` | ใช่ | `3031` | พอร์ตที่ NestJS ฟัง |
| `TRUST_PROXY` | บังคับใน prod | `false` | ตั้ง `true` เมื่ออยู่หลัง Nginx / Cloudflare |

#### Database

| ตัวแปร | บังคับ | ตัวอย่าง |
|--------|--------|----------|
| `MONGO_URI` | ใช่ | `mongodb://localhost:27017/boxphone` หรือ Atlas connection string |

#### Auth / JWT

| ตัวแปร | บังคับ | คำอธิบาย |
|--------|--------|----------|
| `JWT_SECRET` | ใช่ | ความลับยาว ≥ 32 ตัวอักษร — **ห้ามใช้ค่า default ใน production** |
| `JWT_EXPIRATION` | optional | default `1d` |
| `DEVICE_SOCKET_SECRET` | ใช่ | secret ที่อุปกรณ์/agent ใช้ authenticate WebSocket |
| `BCRYPT_SALT_ROUNDS` | optional | default `10` |

#### CORS / Cookie

| ตัวแปร | บังคับ | คำอธิบาย |
|--------|--------|----------|
| `CORS_ORIGINS` | **บังคับใน prod** | คั่นด้วย comma ใส่ origin ของ admin + user — REST และ Socket.IO ใช้ชุดเดียวกัน |
| `COOKIE_DOMAIN` | ใช้ถ้าแชร์ subdomain | เช่น `.myrealphone.cloud` เพื่อให้คุกกี้ใช้ร่วมระหว่าง api / admin / user |

#### Admin seed

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `ADMIN_USERNAME` | ชื่อแอดมินตั้งต้น |
| `ADMIN_PASSWORD` | รหัสแอดมินตั้งต้น — เปลี่ยนทุกครั้งใน production |
| `ALLOW_ADMIN_SEED_IN_PRODUCTION` | `false` ใน prod (ป้องกัน reset password ทุกครั้งที่ restart) |

#### Xiaowei (ถ้าใช้)

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `XIAOWEI_WS_URL` | default `ws://127.0.0.1:22222/` |
| `XIAOWEI_API_URL` | default `http://127.0.0.1:8080` |
| `XIAOWEI_API_KEY` / `XIAOWEI_USERNAME` / `XIAOWEI_PASSWORD` | optional |

#### ADB / Screenshot

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `ADB_PATH` | path เต็มของ `adb` (เช่น `C:\Program Files (x86)\xiaowei_android\tools\adb.exe`) — ใส่เมื่อ `adb` ไม่อยู่ใน PATH |
| `ADB_TOUCH_MODE` | `swipe` (แนะนำสำหรับ Samsung Galaxy Note) หรือ `motionevent` |
| `SCREENSHOT_CACHE_TTL_MS` | default `8000` |
| `SCREENSHOT_MAX_CONCURRENT` | default `2` |

#### Streaming mode

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `STREAMING_MODE` | `screenshot` (default, polling PNG ทุก 2s) หรือ `scrcpy` (H.264 30 FPS) |
| `SCRCPY_SERVER_VERSION` | default `2.4` — ต้องตรงกับ jar ใน `backend/assets/` |
| `SCRCPY_VIDEO_BITRATE` | default `3000000` (3 Mbps) |
| `SCRCPY_VIDEO_ENCODER` | แนะนำ `c2.android.avc.encoder` (กัน crash บน Samsung + Android 10) |
| `SCRCPY_MAX_FPS` | default `30` |
| `SCRCPY_MAX_SIZE` | default `1280` (px) |
| `SCRCPY_PORT_POOL_START` | default `27183` |
| `SCRCPY_PORT_POOL_SIZE` | default `100` |
| `SCRCPY_IDLE_TIMEOUT_MS` | default `30000` |
| `MAX_CONCURRENT_STREAMS` | default `20` |

#### Sessions (optional)

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `SESSION_MAX_MOVE_COUNT` | จำกัด log การเคลื่อนไหวต่อ session |
| `SESSION_DEFAULT_DISCONNECT_REASON` | ข้อความ default ตอนตัด session |

#### Activity log → Google Sheets (optional)

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `GOOGLE_SHEETS_SPREADSHEET_ID` | ID ของ sheet |
| `GOOGLE_SHEETS_TAB_NAME` | เช่น `Sheet1` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON ทั้งก้อน (private_key ใช้ `\\n`) |
| `GOOGLE_APPLICATION_CREDENTIALS` | หรือชี้ไฟล์ service-account.json แทน |

---

### 7.2 `admin/.env.local` (dev) / `admin/.env.production` (build)

| ตัวแปร | บังคับ | คำอธิบาย |
|--------|--------|----------|
| `NEXT_PUBLIC_API_BASE_URL` | ใช่ | URL ของ backend ที่เบราว์เซอร์เรียก เช่น `https://api.myrealphone.cloud` |
| `NEXT_PUBLIC_API_URL` | optional | ค่าสำรอง (โค้ดอ่านลำดับ `NEXT_PUBLIC_API_BASE_URL` → `NEXT_PUBLIC_BACKEND_URL` → `NEXT_PUBLIC_API_URL`) |
| `BACKEND_PROXY_URL` *(ใช้ตอน PM2)* | ใช่ | server-side proxy ของ Next.js → backend (เช่น `http://127.0.0.1:3031`) — ตั้งใน `ecosystem.config.js` |

### 7.3 `user/.env.local` (dev) / `user/.env.production` (build)

| ตัวแปร | บังคับ | คำอธิบาย |
|--------|--------|----------|
| `NEXT_PUBLIC_API_BASE_URL` | ใช่ | URL ของ backend |
| `NEXT_PUBLIC_API_URL` | optional | สำรอง |
| `NEXT_PUBLIC_SOCKET_URL` | แนะนำ | URL Socket.IO (มักเป็น URL เดียวกับ backend) |
| `BACKEND_PROXY_URL` *(ใช้ตอน PM2)* | ใช่ | proxy server-side |

> **สำคัญ:** ทุก origin ใน `NEXT_PUBLIC_API_BASE_URL` ของ admin/user ต้องตรงกับรายการใน `CORS_ORIGINS` ของ backend ไม่งั้นเบราว์เซอร์จะถูกบล็อก

---

## 8. การรันใน Production บนเครื่อง Server (PM2)

ไฟล์ `ecosystem.config.js` ที่ root กำหนด PM2 apps ครบทุกตัว (production + staging รันคู่กันได้):

| App name | คือ | port | mode |
|----------|-----|------|------|
| `boxphone-backend` | NestJS prod | `3031` | scrcpy |
| `boxphone-admin` | Next.js admin prod | `3000` | – |
| `boxphone-user` | Next.js user prod | `3001` | – |
| `boxphone-backend-staging` | NestJS staging | `3032` | scrcpy |
| `boxphone-admin-staging` | Next.js admin staging | `3010` | – |
| `boxphone-user-staging` | Next.js user staging | `3011` | – |

### 8.1 Build + start (ครั้งแรก)

มี script ช่วยบน Windows:

```bash
# จาก root
scripts\deploy-windows.bat
```

Script นี้จะ:
1. `pm2 kill` ล้าง daemon เก่า (ป้องกัน EPERM)
2. `npm install && npm run build` ของ backend / admin / user
3. สร้าง `logs/`
4. `pm2 start ecosystem.config.js --env production`
5. `pm2 save --force`
6. แจ้งให้ติดตั้ง auto-start

หรือทำเองทีละขั้น:

```bash
# build
cd backend && npm ci && npm run build && cd ..
cd admin   && npm ci && npm run build && cd ..
cd user    && npm ci && npm run build && cd ..

# start production เท่านั้น
pm2 start ecosystem.config.js --env production --only boxphone-backend,boxphone-admin,boxphone-user

# start เฉพาะ staging
pm2 start ecosystem.config.js --only boxphone-backend-staging,boxphone-admin-staging,boxphone-user-staging

# บันทึก process list (ให้ resurrect ได้)
pm2 save --force
```

---

## 9. Cheat Sheet คำสั่ง PM2 ที่ต้องใช้บนเครื่องลูกค้า

> นี่คือคำสั่งที่ทีมต้องใช้ทุกครั้งที่ไปแก้/ดูแลเครื่อง server ที่ลูกค้า — copy ไปใช้ได้เลย

### ดูสถานะ

```bash
pm2 list                    # ดู apps ทั้งหมด + สถานะ + RAM/CPU
pm2 status                  # alias ของ list
pm2 describe boxphone-backend   # รายละเอียดเชิงลึกของ 1 app
pm2 monit                   # หน้า monitor real-time (CPU/MEM/log)
```

### ดู log

```bash
pm2 logs                              # log รวมทุก app
pm2 logs boxphone-backend             # log เฉพาะ backend
pm2 logs boxphone-backend --lines 200 # ดูย้อนหลัง 200 บรรทัด
pm2 logs boxphone-backend --err       # เฉพาะ error
pm2 flush                             # ล้าง log file ทั้งหมด
```

ไฟล์ log จริงอยู่ที่:
- `logs/backend-out.log`, `logs/backend-err.log`
- `logs/admin-out.log`, `logs/admin-err.log`
- `logs/user-out.log`, `logs/user-err.log`
- (staging: เติม `-staging-` กลางชื่อ)

### Start / Stop / Restart

```bash
# restart ทั้งหมด
pm2 restart all

# restart เฉพาะตัวเดียว
pm2 restart boxphone-backend
pm2 restart boxphone-admin
pm2 restart boxphone-user

# reload (zero-downtime, fork mode รีสตาร์ทตรงๆ)
pm2 reload boxphone-backend

# หยุดชั่วคราว (ยังอยู่ใน list)
pm2 stop boxphone-backend

# ลบออกจาก list
pm2 delete boxphone-backend

# หยุดทั้งหมดและล้าง daemon
pm2 kill
```

### Update โค้ดใหม่ → restart

```bash
# 1. ดึงโค้ดล่าสุด
cd C:\path\to\boxphone-project
git pull

# 2. build ใหม่เฉพาะส่วนที่แก้
cd backend && npm ci && npm run build && cd ..
cd admin   && npm ci && npm run build && cd ..
cd user    && npm ci && npm run build && cd ..

# 3. restart service ที่เกี่ยว
pm2 restart boxphone-backend
pm2 restart boxphone-admin boxphone-user

# 4. save state
pm2 save --force
```

> **ทิป:** ถ้าแก้แค่ frontend ไม่ต้อง restart backend
> ถ้าแก้แค่ `.env` ของ backend → `pm2 restart boxphone-backend --update-env`

### Update Environment Variable

```bash
# แก้ ecosystem.config.js แล้ว reload env
pm2 restart boxphone-backend --update-env
pm2 save --force
```

### ตั้งให้รันอัตโนมัติเมื่อรีบูต (Linux/Mac)

```bash
pm2 startup        # จะแสดงคำสั่งให้รัน (มัก sudo systemd…)
# ทำตามที่ pm2 บอก
pm2 save           # บันทึก process list ให้ resurrect ตอน boot
```

**Windows:** ใช้ `scripts/setup-autostart.bat` แทน (ดูข้อ [13](#13-auto-start-เมื่อเปิดเครื่อง-windows))

### เรียกกลับ process list หลังเครื่องบูต

```bash
pm2 resurrect      # อ่านจาก ~/.pm2/dump.pm2 และ start apps กลับมา
```

### ลด log บวม (logrotate)

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

---

## 10. ADB — สำหรับดึงภาพหน้าจอ / ส่ง input

### ติดตั้ง

- **Windows:** ดาวน์โหลด [Android Platform Tools](https://developer.android.com/studio/releases/platform-tools) → แตก zip → เพิ่ม path เข้า `PATH`
- **Linux:** `sudo apt install android-tools-adb`
- **macOS:** `brew install android-platform-tools`

### ตรวจสอบ

```bash
adb devices
# List of devices attached
# 5931563651483498    device
# 39595a4144363498    device
```

ถ้าขึ้น `unauthorized` → กด "อนุญาต" บนหน้าจอมือถือ

### ทดสอบ screenshot

```bash
adb -s <serial> exec-out screencap -p > test.png
```

### คำสั่ง ADB ที่ระบบใช้ภายใน (ข้อมูล)

- `adb -s <serial> exec-out screencap -p` → ดึงภาพ (cache TTL ตาม `SCREENSHOT_CACHE_TTL_MS`)
- `adb -s <serial> shell input tap <x> <y>` → tap
- `adb -s <serial> shell input swipe x1 y1 x2 y2 ms` → swipe / drag
- `adb -s <serial> shell input keyevent <code>` → ปุ่ม (HOME, BACK, …)
- `adb -s <serial> shell input text "<text>"` → พิมพ์

อ่านเพิ่ม: [`docs/SCREENSHOT-SETUP.md`](./docs/SCREENSHOT-SETUP.md)

---

## 11. scrcpy H.264 Streaming (Optional)

โหมดสตรีมวิดีโอแบบ real-time แทนการ polling รูป

### เปิดใช้

```env
# backend/.env
STREAMING_MODE=scrcpy
SCRCPY_SERVER_VERSION=2.4
```

### ติดตั้ง scrcpy-server.jar

```bash
node scripts/download-scrcpy-server.js
# ดาวน์โหลดและวางไว้ที่ backend/assets/scrcpy-server-v2.4.jar
```

อ่านเพิ่ม: [`docs/SCRCPY-SETUP.md`](./docs/SCRCPY-SETUP.md)

> **Rollback:** ถ้า scrcpy มีปัญหา → ตั้ง `STREAMING_MODE=screenshot` แล้ว `pm2 restart boxphone-backend --update-env` กลับมาใช้ polling ได้ทันที

---

## 12. Cloudflare Tunnel (HTTPS โดยไม่ต้องเปิดพอร์ต)

ใช้ `cloudflared` ทำ HTTPS proxy เข้าเครื่อง server โดยไม่ต้องมี static IP

### Setup

```bash
# 1. ติดตั้ง cloudflared
# Windows: ดาวน์โหลด installer จาก cloudflare
# Linux/Mac: ดูเอกสาร cloudflare

# 2. ล็อกอินและสร้าง tunnel
cloudflared tunnel login
cloudflared tunnel create boxphone
cloudflared tunnel list   # copy TUNNEL_ID

# 3. คัดลอก template + แก้ค่า
cp cloudflare/config.yml.template ~/.cloudflared/config.yml
# แก้ TUNNEL_ID และ DOMAIN_HERE

# 4. ผูก DNS
cloudflared tunnel route dns boxphone api.yourdomain.com
cloudflared tunnel route dns boxphone admin.yourdomain.com
cloudflared tunnel route dns boxphone app.yourdomain.com

# 5. รัน
cloudflared tunnel run
# Windows: ติดตั้งเป็น service → cloudflared service install
```

### Ingress (จาก `cloudflare/config.yml.template`)

| Host | → | Service |
|------|---|---------|
| `api.DOMAIN_HERE.com` | → | `http://localhost:3031` (backend) |
| `admin.DOMAIN_HERE.com` | → | `http://localhost:3000` (admin) |
| `app.DOMAIN_HERE.com` | → | `http://localhost:3001` (user) |

---

## 13. Auto-Start เมื่อเปิดเครื่อง (Windows)

ใช้ Task Scheduler รัน `pm2 resurrect` อัตโนมัติหลัง login

```bash
# รันครั้งเดียวด้วย admin
scripts\setup-autostart.bat
```

Script จะ:
1. สร้าง `scripts/pm2-resurrect.vbs` (รัน PM2 แบบ hidden)
2. สร้าง Task Scheduler ชื่อ `BoxPhone-PM2-AutoStart`
3. ตั้งให้รัน 30 วินาทีหลัง login

ตรวจสอบ / ลบ:

```bash
schtasks /query /tn "BoxPhone-PM2-AutoStart"
schtasks /delete /tn "BoxPhone-PM2-AutoStart" /f
```

---

## 14. Workflow ของทีมเมื่อเพิ่มคนใหม่เข้ามาแก้โปรเจกต์

เช็คลิสต์เมื่อมีนักพัฒนาใหม่เข้าทีม:

### 14.1 บัญชี / สิทธิ์

- [ ] เพิ่มเข้า GitHub repo (สิทธิ์ write / maintain)
- [ ] เพิ่มเข้าช่อง Slack / Discord ของทีม
- [ ] ขอ MongoDB connection string (ของ dev/staging)
- [ ] ขอไฟล์ `.env.*` ตัวอย่างจากเพื่อนในทีม (ห้ามอยู่บน git)
- [ ] (ถ้ามี) ขอ Cloudflare account access สำหรับดู tunnel
- [ ] (ถ้ามี) ขอสิทธิ์เข้า Server ลูกค้า (RDP / SSH)

### 14.2 ตั้งเครื่อง dev

ทำตามข้อ [6](#6-quick-start--ตั้งโปรเจกต์ครั้งแรก-developer) — Quick Start

### 14.3 อ่านเอกสารตามลำดับ

1. **README.md** (ไฟล์นี้) — ภาพรวม
2. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — โครงสร้าง backend
3. [`docs/DEPLOY.md`](./docs/DEPLOY.md) — env + CORS + Nginx
4. [`docs/SCREENSHOT-SETUP.md`](./docs/SCREENSHOT-SETUP.md) — ADB
5. [`docs/CLIENT-DELIVERY-HANDBOOK.md`](./docs/CLIENT-DELIVERY-HANDBOOK.md) — ส่งมอบลูกค้า
6. ไฟล์ `XIAOWEI_*.md` ใน `docs/` — ตามต้องการ

### 14.4 Convention / กฎทีม

- ทำงานบน branch ของตัวเอง → PR เข้า `main`
- รัน `npm run lint` ก่อน push (backend / admin / user)
- **ห้าม commit** `.env`, `.env.local`, `.env.production`, `*.log`, `node_modules/`, `dist/`, `.next/`
- ถ้าเพิ่ม env ใหม่ในโค้ด → **อัปเดต `backend/.env.example` ทันที** + แก้ตารางใน README นี้
- ห้ามแก้ schema MongoDB โดยไม่ migrate
- ห้าม push ตรงไป `main` ของ production

### 14.5 ทดสอบก่อน commit

```bash
# backend
cd backend && npm run lint && npm run build

# admin / user
cd admin && npm run lint && npm run build
cd user  && npm run lint && npm run build
```

---

## 15. Workflow Deploy / Update โค้ดใหม่ลงเครื่อง Server ลูกค้า

> เมื่อต้องไป update โค้ดบนเครื่องลูกค้า (RDP เข้าเครื่อง / SSH)

### 15.1 Update ปกติ (มี downtime สั้นๆ)

```bash
# เข้าโฟลเดอร์โปรเจกต์บนเครื่อง server
cd C:\path\to\boxphone-project

# 1. (ทุกครั้ง) สำรองไฟล์สำคัญก่อน
copy backend\.env backend\.env.bak
copy ecosystem.config.js ecosystem.config.js.bak

# 2. ดึงโค้ดล่าสุด
git status      # ตรวจว่าไม่มี local change ค้างอยู่
git pull origin main

# 3. install + build
cd backend && npm ci && npm run build && cd ..
cd admin   && npm ci && npm run build && cd ..
cd user    && npm ci && npm run build && cd ..

# 4. restart (เลือกเฉพาะที่แก้)
pm2 restart boxphone-backend
pm2 restart boxphone-admin
pm2 restart boxphone-user

# 5. save
pm2 save --force

# 6. ตรวจสอบ
pm2 list
pm2 logs --lines 50
```

### 15.2 Update โดยใช้ staging ก่อน (zero-risk)

```bash
# 1. ทำตามขั้น 1-3 ของ 15.1

# 2. start เฉพาะ staging
pm2 start ecosystem.config.js --only boxphone-backend-staging,boxphone-admin-staging,boxphone-user-staging

# 3. ทดสอบบน port 3032/3010/3011

# 4. ถ้า OK → restart production
pm2 restart boxphone-backend boxphone-admin boxphone-user

# 5. หยุด staging (optional)
pm2 stop boxphone-backend-staging boxphone-admin-staging boxphone-user-staging
```

### 15.3 Rollback ถ้า deploy พัง

```bash
# กลับไป commit ก่อนหน้า
git log --oneline | head -5
git checkout <commit-hash>

# build + restart
cd backend && npm ci && npm run build && cd ..
cd admin   && npm ci && npm run build && cd ..
cd user    && npm ci && npm run build && cd ..

pm2 restart all
pm2 save --force
```

### 15.4 Update เฉพาะ env (ไม่ต้อง build)

```bash
# แก้ backend/.env
notepad backend\.env

# restart พร้อม reload env
pm2 restart boxphone-backend --update-env
pm2 save --force
```

---

## 16. Troubleshooting รวม

| อาการ | สาเหตุ / วิธีตรวจ | วิธีแก้ |
|--------|--------------------|---------|
| `error during connect…` ตอน docker | ไม่ได้เปิด Docker Desktop | เปิด Docker Desktop รอจน icon ขึ้นแล้วรันใหม่ |
| Database connect fail | container ไม่ขึ้น | `docker ps` เช็ค container — ถ้าหายไป `docker-compose up -d` |
| เปิดเว็บแล้วต่อ backend ไม่ได้ (CORS) | `CORS_ORIGINS` ไม่มี origin ของเว็บ | เพิ่ม origin จริง (มี `https://`) ใน `backend/.env` แล้ว `pm2 restart boxphone-backend --update-env` |
| Login แล้วเด้งออก / ไม่มี cookie | ไม่ใช่ HTTPS / `TRUST_PROXY=false` ทั้งที่อยู่หลัง proxy | เปิด HTTPS ผ่าน Cloudflare Tunnel + ตั้ง `TRUST_PROXY=true` |
| Admin login แล้วยังไม่เห็นข้อมูล | `BACKEND_PROXY_URL` ใน ecosystem ผิด | แก้ใน `ecosystem.config.js` → `pm2 restart boxphone-admin --update-env` |
| ไม่เห็นภาพหน้าจอเครื่อง | ADB ไม่เจอ / serial ไม่ตรง | `adb devices` → เช็ค serial ใน DB → ถ้าจำเป็นตั้ง `ADB_PATH` ใน `.env` |
| EPERM ตอน `pm2 start` (Windows) | daemon เก่าค้าง | `pm2 kill` แล้ว start ใหม่ |
| PM2 ไม่กลับมาตอนรีบูต (Linux) | ลืม `pm2 startup` + `pm2 save` | `pm2 startup` → ทำตาม → `pm2 save` |
| PM2 ไม่ resurrect (Windows) | ลืมตั้ง Task Scheduler | รัน `scripts\setup-autostart.bat` |
| scrcpy crash บน Samsung Android 10 | ใช้ HW encoder default | ตั้ง `SCRCPY_VIDEO_ENCODER=c2.android.avc.encoder` ใน env |
| Swipe ไม่ทำงานบน Samsung Galaxy Note | touch mode | ตั้ง `ADB_TOUCH_MODE=swipe` |
| Cloudflare Tunnel `bad gateway` | service ไม่รัน หรือ port ผิดใน `config.yml` | `pm2 list` ดูว่า app รันอยู่ port ตรงกับ ingress |
| Admin/User build ขึ้น warning `baseline-browser-mapping` | ปกติ — script filter ออกแล้ว | ใช้ `npm run build:verbose` ถ้าอยากเห็น log เต็ม |
| Xiaowei ไม่ sync เครื่อง | Xiaowei Desktop ปิด / port ผิด | เปิดโปรแกรม Xiaowei + ตรวจ `XIAOWEI_WS_URL` / `XIAOWEI_API_URL` |

---

## 17. เอกสารอ้างอิงในโปรเจกต์

| ไฟล์ | เนื้อหา |
|------|---------|
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | โครงสร้าง backend, modular design |
| [`docs/DEPLOY.md`](./docs/DEPLOY.md) | env, CORS, cookie, Nginx — Production deploy |
| [`docs/CLIENT-DELIVERY-HANDBOOK.md`](./docs/CLIENT-DELIVERY-HANDBOOK.md) | คู่มือส่งมอบลูกค้า (อ่านง่าย ไม่ต้องเป็น dev) |
| [`docs/MEETING-DEPLOY-AND-PRICING-GUIDE.md`](./docs/MEETING-DEPLOY-AND-PRICING-GUIDE.md) | คู่มือเตรียมประชุมลูกค้า + แพ็กเกจราคา |
| [`docs/SCREENSHOT-SETUP.md`](./docs/SCREENSHOT-SETUP.md) | ตั้งค่า ADB ดึงภาพหน้าจอ |
| [`docs/SCRCPY-SETUP.md`](./docs/SCRCPY-SETUP.md) | ตั้งค่า scrcpy H.264 stream |
| [`docs/USER-MANUAL.md`](./docs/USER-MANUAL.md) | คู่มือผู้ใช้ |
| [`docs/XIAOWEI_SETUP.md`](./docs/XIAOWEI_SETUP.md) | ตั้งค่า Xiaowei |
| [`docs/XIAOWEI_TROUBLESHOOTING.md`](./docs/XIAOWEI_TROUBLESHOOTING.md) | แก้ปัญหา Xiaowei |
| [`docs/XIAOWEI_ACTIVATION_REQUIRED.md`](./docs/XIAOWEI_ACTIVATION_REQUIRED.md) | VIP / activation |
| [`docs/XIAOWEI_VERIFICATION_CODE_TROUBLESHOOTING.md`](./docs/XIAOWEI_VERIFICATION_CODE_TROUBLESHOOTING.md) | ปัญหารหัสยืนยัน |
| [`backend/API_TESTING.md`](./backend/API_TESTING.md) | คู่มือเทส API |
| [`backend/postman_collection.json`](./backend/postman_collection.json) | Postman collection |

---

## License

Private / proprietary — internal use only

---

*อัปเดต README นี้ทุกครั้งที่: เพิ่ม env ใหม่, เพิ่ม PM2 app ใหม่, เปลี่ยน port หรือ workflow deploy*
