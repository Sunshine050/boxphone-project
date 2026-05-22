# 🤖 BoxPhone Discord Notification Bot — Runbook

<table>
<tr><td><strong>เวอร์ชัน</strong></td><td>1.1</td><td><strong>วันที่</strong></td><td>2026-05-22</td></tr>
<tr><td><strong>Branch</strong></td><td><code>feature/discord-notification</code></td><td><strong>Commit</strong></td><td><code>3a2794d</code></td></tr>
<tr><td><strong>สำหรับ</strong></td><td>FullStack Force (senior dev / ops)</td><td><strong>Port</strong></td><td><code>4001</code></td></tr>
</table>

---

## ⚡ Quick Start (ใช้ตอนเร่งด่วน)

```bash
# ตรวจสอบ bot ทำงานอยู่ไหม
curl http://localhost:4001/health

# ดู logs แบบ live
pm2 logs boxphone-discord-bot

# Restart
pm2 restart boxphone-discord-bot

# หา error ทั้งหมด
pm2 logs boxphone-discord-bot --raw --lines 200 | grep '"outcome":"error"'

# Deploy หลังแก้ code
cd discord-bot && git pull && npm install && npm run build && pm2 restart boxphone-discord-bot
```

---

## สารบัญ

**ส่วนที่ 1 — ทำความเข้าใจ**
- [1.1 Bot คืออะไร](#11-bot-คืออะไร)
- [1.2 สถาปัตยกรรม](#12-สถาปัตยกรรม)
- [1.3 โครงสร้างไฟล์](#13-โครงสร้างไฟล์)

**ส่วนที่ 2 — การติดตั้งและตั้งค่า**
- [2.1 ความต้องการและการติดตั้ง](#21-ความต้องการและการติดตั้ง)
- [2.2 Environment Variables](#22-environment-variables)
- [2.3 การรัน Bot](#23-การรัน-bot)
- [2.4 PM2 Production](#24-pm2-production)

**ส่วนที่ 3 — การดูแลระบบ**
- [3.1 Logs & Monitoring](#31-logs--monitoring)
- [3.2 Health Check](#32-health-check)
- [3.3 Troubleshooting](#33-troubleshooting)
- [3.4 Security](#34-security)

**ส่วนที่ 4 — ข้อมูลอ้างอิง**
- [4.1 Webhook Event Schema](#41-webhook-event-schema)
- [4.2 Testing](#42-testing)
- [4.3 Known Issues & Backlog](#43-known-issues--backlog)
- [4.4 Architecture Decisions](#44-architecture-decisions)
- [4.5 Escalation & Ownership](#45-escalation--ownership)
- [4.6 Reference Documents](#46-reference-documents)

---

# ส่วนที่ 1 — ทำความเข้าใจ

## 1.1 Bot คืออะไร

Bot นี้คือ **HTTP server** ที่รับ webhook จาก NestJS backend แล้วส่ง **Discord DM** แจ้งเตือน user/admin เมื่อเกิด event ในระบบ MyrealPhone

> **💡 สำคัญ:** Bot นี้ **ไม่ใช่ Discord chat bot** — ไม่รับคำสั่ง ไม่อยู่ใน server ส่งแค่ DM เท่านั้น

```
NestJS Backend ──POST /webhook──► Discord Bot (port 4001) ──DM──► User + Admin
```

### Event ที่รองรับ

| # | Event | เกิดเมื่อ | DM สี |
|:---:|---|---|:---:|
| 1 | `session_start` | User โหลด `/sessions/me` → auto-start | 🟢 |
| 2 | `session_warning` | Cron — เหลือเวลา ≤ 5 นาที (ส่ง 2 ครั้ง) | 🟡 |
| 3 | `session_end` | เวลาหมด → auto-kick | 🟠 |
| 4 | `device_offline` | Xiaowei websocket ขาดการเชื่อมต่อ | 🔴 |
| 5 | `device_online` | Xiaowei websocket กลับมา | 🟢 |

> **❌ Out of scope:** `payment_received` / `payment_failed` — payment ไม่ผ่านระบบ admin เติมเวลาด้วยมือ

### Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ LTS |
| HTTP Server | Express 4 |
| Discord API | discord.js 14 |
| Validation | Zod 3 (runtime schema + TypeScript types) |
| Logger | pino 9 → JSON lines (production) |
| Process Manager | PM2 |
| Language | TypeScript 5 |

---

## 1.2 สถาปัตยกรรม

### Request Pipeline

```
POST /webhook
    │
    ▼
┌─────────────────────────────────────────┐
│  authMiddleware                         │ ← ตรวจ X-Webhook-Secret header
│  401 ถ้าผิด                             │
└────────────────┬────────────────────────┘
                 │ ผ่าน
                 ▼
┌─────────────────────────────────────────┐
│  AnyEvent.safeParse(req.body)           │ ← Zod validate ทุก field
│  400 ถ้า schema ไม่ตรง                  │
└────────────────┬────────────────────────┘
                 │ valid
                 ▼
┌─────────────────────────────────────────┐
│  isDuplicate(eventId)                   │ ← LRU cache 60s
│  200 + duplicate ถ้าเคยเห็นแล้ว         │
└────────────────┬────────────────────────┘
                 │ ไม่ซ้ำ
                 ▼
┌─────────────────────────────────────────┐
│  routeEvent(client, event)              │
│    ├── buildEmbed(event)                │ ← สร้าง Discord embed ตาม type
│    ├── sendAdminDM(client, embed)       │ ← DM admin เสมอ (จาก .env)
│    └── sendUserDM(client, id, embed)   │ ← DM user ถ้ามี discordUserId
└────────────────┬────────────────────────┘
                 │
                 ▼
    log { eventId, type, outcome, latency_ms }
                 │
                 ▼
            200 { status: 'ok' }
```

### Response Codes Summary

| Code | Body | ความหมาย |
|:---:|---|---|
| `200` | `{"status":"ok"}` | สำเร็จ — DM ส่งแล้ว |
| `200` | `{"status":"duplicate"}` | eventId ซ้ำ — dedup ป้องกัน |
| `400` | `{"error":"Invalid payload"}` | Schema ไม่ตรง — ตรวจ payload |
| `401` | `{"error":"Unauthorized"}` | Secret ผิด — ตรวจ env var |
| `500` | `{"error":"Internal error"}` | Discord API ล้มเหลว — ดู logs |

---

## 1.3 โครงสร้างไฟล์

```
discord-bot/
├── src/
│   ├── server.ts              ← Entry point: Discord login + Express server
│   ├── lib/
│   │   └── logger.ts          ← Pino config (pretty dev / JSON prod)
│   ├── middleware/
│   │   ├── auth.ts            ← X-Webhook-Secret ตรวจทุก request
│   │   └── dedup.ts           ← In-memory Map<eventId, timestamp> 60s window
│   ├── types/
│   │   └── events.ts          ← Zod discriminatedUnion ของ 5 event types
│   └── handlers/
│       ├── embeds.ts          ← buildEmbed() → EmbedBuilder per type
│       ├── router.ts          ← routeEvent() → admin + user DM
│       ├── admin.ts           ← sendAdminDM() จาก ADMIN_DISCORD_ID
│       └── user.ts            ← sendUserDM() จาก payload discordUserId
├── postman/
│   └── *.postman_collection.json   ← 16 requests, 5 folders
├── .env.example               ← template — คัดลอกเป็น .env
├── package.json
└── tsconfig.json
```

### แก้ไฟล์ไหนเมื่อต้องการอะไร

| ต้องการ | แก้ไฟล์นี้ |
|---|---|
| เพิ่ม event type ใหม่ | `types/events.ts` → `handlers/embeds.ts` |
| เปลี่ยนข้อความ/สีใน DM | `handlers/embeds.ts` |
| เพิ่ม admin หลายคน | `handlers/admin.ts` (ดู backlog) |
| เปลี่ยน dedup window | `DEDUP_WINDOW_MS` ใน `.env` |
| เปลี่ยน log level | `LOG_LEVEL` ใน `.env` |
| เพิ่ม route ใหม่ | `server.ts` |

---

# ส่วนที่ 2 — การติดตั้งและตั้งค่า

## 2.1 ความต้องการและการติดตั้ง

### ความต้องการ

- Node.js 20+ (LTS)
- npm 10+
- PM2: `npm install -g pm2`
- เข้าถึง Discord Developer Portal
- สิทธิ์เข้า repo: https://github.com/Sunshine050/boxphone-project

### ขั้นตอนติดตั้ง (fresh machine)

```bash
# Step 0: clone repo
git clone --branch feature/discord-notification https://github.com/Sunshine050/boxphone-project.git
cd boxphone-project/discord-bot

# Step 1: install dependencies
npm install

# Step 2: สร้าง .env จาก template
cp .env.example .env
# แก้ค่าใน .env (ดูหัวข้อ 2.2)

# Step 3: build
npm run build

# Step 4: สร้าง logs directory (PM2 จะ crash ถ้าโฟลเดอร์ไม่มี)
mkdir -p ../logs

# Step 5: start bot
# ─── development (auto-reload) ───
npm run dev

# ─── production (PM2) ── รันจาก root ของ monorepo ───
cd ..
pm2 start ecosystem.config.js --only boxphone-discord-bot --env production

# Step 6: ตรวจสอบ
curl http://localhost:4001/health
# {"status":"ok","botReady":true} ← ต้องเห็นแบบนี้
```

### การได้ Bot Token

1. https://discord.com/developers/applications → เลือก **BoxPhone Bot**
2. Sidebar → **Bot** → **Reset Token** → copy
3. ใส่ใน `.env` ที่ `DISCORD_BOT_TOKEN=`

> **⚠️ หมายเหตุ:** Reset token ทำให้ instance เดิมหลุดทันที — restart bot หลัง reset

### Discord Bot Permissions ที่ต้องขอ

| Permission | จำเป็น | เหตุผล |
|---|:---:|---|
| Send Messages | ✅ | ส่ง DM |
| Embed Links | ✅ | ใช้ embed builder |
| View Channels | ✅ | discord.js requirement |
| Administrator | ❌ | ไม่ต้องการ |

**Intent ที่ใช้:** `Guilds` เท่านั้น — DM ผ่าน REST API ไม่ใช่ gateway

---

## 2.2 Environment Variables

ไฟล์: `discord-bot/.env` (ห้าม commit ขึ้น git)

| Variable | จำเป็น | ค่า default | คำอธิบาย |
|---|:---:|---|---|
| `DISCORD_BOT_TOKEN` | ✅ | — | Token จาก Developer Portal |
| `WEBHOOK_SECRET` | ✅ | — | ต้องตรงกับ backend `.env` ทุกตัวอักษร |
| `ADMIN_DISCORD_ID` | ✅ | — | Discord User ID ของ admin (ตัวเลข 17-19 หลัก) |
| `PORT` | optional | `4000` | HTTP port (แนะนำ `4001`) |
| `LOG_LEVEL` | optional | `info` | `trace` / `debug` / `info` / `warn` / `error` |
| `DEDUP_WINDOW_MS` | optional | `60000` | หน้าต่าง dedup (milliseconds) |
| `NODE_ENV` | optional | — | ตั้งเป็น `production` เพื่อเปิด JSON logs |

### สร้าง WEBHOOK_SECRET

```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
[Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLower()
```

### หา Discord User ID

1. Discord → User Settings → Advanced → เปิด **Developer Mode**
2. คลิกขวาที่ชื่อ user → **Copy User ID**
3. ตัวอย่าง: `515550480680615937`

> **⚠️ สำคัญ:** `ADMIN_DISCORD_ID` ต้องเป็น **User ID ตัวเลข** ไม่ใช่ username#tag

---

## 2.3 การรัน Bot

### Development Mode

```bash
npm run dev
# ใช้ ts-node-dev — auto-reload เมื่อแก้ไฟล์
# logs แสดงสี (pino-pretty)
```

### Production Mode

```bash
npm run build   # tsc → dist/
npm start       # node dist/server.js
# logs เป็น JSON lines
```

### ตรวจสอบว่า start สำเร็จ

```bash
curl http://localhost:4001/health
# ✅ {"status":"ok","botReady":true}
# ⚠️ {"status":"ok","botReady":false} → bot ยัง login ไม่เสร็จ รอ 10s
```

---

## 2.4 PM2 Production

### คำสั่ง PM2 ที่ใช้บ่อย

```bash
# ─── Start ───────────────────────────────────────────
pm2 start ecosystem.config.js --only boxphone-discord-bot --env production
pm2 start ecosystem.config.js --env production          # start ทุก service

# ─── Monitor ─────────────────────────────────────────
pm2 list                                                 # ดูสถานะทุก process
pm2 monit                                                # real-time CPU/memory
pm2 logs boxphone-discord-bot                           # tail logs
pm2 logs boxphone-discord-bot --lines 100               # 100 บรรทัดล่าสุด

# ─── Control ─────────────────────────────────────────
pm2 restart boxphone-discord-bot                        # restart
pm2 reload boxphone-discord-bot                         # zero-downtime reload
pm2 stop boxphone-discord-bot                           # stop
pm2 start boxphone-discord-bot                          # start (หลัง stop)

# ─── Auto-start on boot ───────────────────────────────
pm2 save
pm2 startup      # ทำตามคำสั่งที่ขึ้นมา
```

### PM2 Config (ใน ecosystem.config.js)

```javascript
{
  name: 'boxphone-discord-bot',
  script: 'dist/server.js',
  cwd: './discord-bot',
  instances: 1,
  exec_mode: 'fork',
  restart_delay: 3000,      // รอ 3s ก่อน restart
  max_restarts: 10,          // หยุดหลัง crash 10 ครั้งติดกัน
  watch: false,
  out_file: './logs/discord-bot-out.log',
  error_file: './logs/discord-bot-err.log',
  merge_logs: true,
  log_date_format: 'YYYY-MM-DD HH:mm:ss',
  env_production: { NODE_ENV: 'production', PORT: 4001 },
}
```

> **💡 หมายเหตุ:** Secrets (`DISCORD_BOT_TOKEN`, `WEBHOOK_SECRET`, `ADMIN_DISCORD_ID`) อ่านจาก `discord-bot/.env` ผ่าน `dotenv` — **ไม่ต้องใส่ใน PM2 env**

### Log Rotation (แนะนำ)

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

---

# ส่วนที่ 3 — การดูแลระบบ

## 3.1 Logs & Monitoring

### Log Format (Production = JSON)

```json
{
  "level": 30,
  "time": 1716381528760,
  "eventId": "e1edbeb1-b4ea-4372-882d-a92646b3d3ce",
  "type": "session_start",
  "outcome": "ok",
  "latency_ms": 2677,
  "msg": "Event processed"
}
```

### Log Fields

| Field | ค่าที่เป็นไปได้ | ความหมาย |
|---|---|---|
| `level` | `20` debug / `30` info / `40` warn / `50` error | ระดับ |
| `eventId` | UUID | trace event ข้ามระบบ — backend log ตัวนี้เหมือนกัน |
| `type` | `session_start` / `session_end` / ... | ประเภท event |
| `outcome` | `ok` / `duplicate` / `error` | **ผลลัพธ์** — field สำคัญที่สุด |
| `latency_ms` | integer (ms) | เวลาจาก request รับถึง response ส่ง |
| `discordUserId` | string | Discord ID ของ user ที่ได้รับ DM |
| `adminId` | string | Discord ID ของ admin |
| `err` | object | error details + stack trace |
| `msg` | string | human-readable summary |

### คำสั่ง grep ที่ใช้บ่อย

```bash
# ─── ดู error ───────────────────────────────────────
pm2 logs boxphone-discord-bot --raw | grep '"outcome":"error"'

# ─── trace event เดียวข้ามระบบ ──────────────────────
pm2 logs boxphone-discord-bot --raw | grep '"eventId":"<UUID>"'

# ─── latency > 5 วินาที ─────────────────────────────
pm2 logs boxphone-discord-bot --raw | jq 'select(.latency_ms > 5000)'

# ─── DM blocked (50007) ─────────────────────────────
pm2 logs boxphone-discord-bot --raw | grep "DMs disabled"
```

### Baseline Latency (จาก E2E test 2026-05-22)

| Event | latency_ms ปกติ | แจ้งเตือนถ้า |
|---|:---:|:---:|
| `session_start` | ~2,700 ms | > 10,000 ms |
| `session_warning` | ~1,400 ms | > 10,000 ms |
| `session_end` | ~1,050 ms | > 10,000 ms |
| `device_offline` | ~900 ms | > 10,000 ms |
| `device_online` | ~6,800 ms | > 15,000 ms |

> **💡 latency สูงผิดปกติ** → ตรวจ https://discordstatus.com/ ก่อน

---

## 3.2 Health Check

### Endpoint

```
GET http://localhost:4001/health
```

### Responses

```json
// ✅ Bot ปกติ
{ "status": "ok", "botReady": true }

// ⚠️ HTTP server ทำงาน แต่ Discord ยังไม่ login
{ "status": "ok", "botReady": false }

// ❌ Connection refused → bot crash
```

### ตั้ง Uptime Monitor

ตรวจ `/health` ทุก 60 วินาที แจ้งเตือนเมื่อ:

| สัญญาณ | ความหมาย | Action |
|---|---|---|
| Connection refused / timeout | Bot crash | `pm2 restart boxphone-discord-bot` |
| `botReady: false` นาน > 5 นาที | Discord token ปัญหา | ตรวจ `DISCORD_BOT_TOKEN` |
| `botReady: true` แต่ DM ไม่มา | Logic issue | ดู logs `pm2 logs` |

**เครื่องมือแนะนำ:** UptimeRobot, Healthchecks.io, หรือ custom cron + curl

---

## 3.3 Troubleshooting

### 🔴 Bot ไม่ start เลย

```
DISCORD_BOT_TOKEN is not set — cannot start
```
→ เปิด `discord-bot/.env` ตรวจว่ามี `DISCORD_BOT_TOKEN=...`

```
Error: listen EADDRINUSE :::4001
```
→ `pm2 stop boxphone-discord-bot` แล้ว start ใหม่

```
Error [TokenInvalid]
```
→ Token หมดอายุ — reset ที่ Developer Portal + อัปเดต `.env` + restart

---

### 🔴 Bot start แต่ DM ไม่ถึง

ตรวจตามลำดับนี้:

```
Step 1: botReady?
  curl http://localhost:4001/health
  → ต้องเห็น "botReady":true

Step 2: webhook มาถึงไหม?
  pm2 logs boxphone-discord-bot --lines 50 | grep "Event"
  → ควรเห็น "Event processed" หรือ "Invalid webhook payload"

Step 3: secret ตรงกัน?
  discord-bot/.env   WEBHOOK_SECRET=xxx
  backend/.env       DISCORD_WEBHOOK_SECRET=xxx  ← ต้องเหมือนกัน 100%

Step 4: Discord ID ถูกต้อง?
  ADMIN_DISCORD_ID ต้องเป็นตัวเลข 17-19 หลัก ไม่ใช่ username

Step 5: User ปิด DM ไหม?
  pm2 logs boxphone-discord-bot | grep "DMs disabled"
  → ถ้าเจอ บอก user เปิด Discord → Privacy & Safety → Allow DMs
```

---

### 🔴 DiscordAPIError code 50007

```
Cannot send messages to this user
```

| สาเหตุ | วิธีแก้ |
|---|---|
| User ปิด DM | เปิด Discord → Privacy & Safety → Allow DMs |
| User block bot | Unblock |
| Bot ไม่อยู่ server เดียวกับ user | Invite bot เข้า server ใดๆ ที่ user อยู่ |

> **💡 Bot ไม่ crash** — error จะถูก catch + log warn แล้วทำงาน event ต่อไปได้ปกติ

---

### 🔴 ได้รับ DM 2 ครั้งต่อ event

**สาเหตุ:** `ADMIN_DISCORD_ID` ใน `.env` == `discordUserId` ใน payload — คนเดียวกันเป็นทั้ง admin และ user → รับ DM 2 ฉบับ

**ไม่ใช่ bug** — ใน production admin และ user เป็นคนละ Discord account ปัญหานี้เกิดเฉพาะตอนทดสอบ

---

### 🔴 Bot restart loop

```bash
pm2 list   # ดูคอลัมน์ ↺ restart — ถ้าตัวเลขขึ้นเร็ว = loop
pm2 logs boxphone-discord-bot --err --lines 50   # ดู error จริง
```

หลังแก้ปัญหาแล้ว reset restart counter:
```bash
pm2 delete boxphone-discord-bot
pm2 start ecosystem.config.js --only boxphone-discord-bot --env production
```

---

### 🔴 latency_ms > 10,000ms บ่อยๆ

```bash
# ตรวจตามลำดับ
1. https://discordstatus.com/            ← Discord API status
2. curl -w "%{time_total}" https://discord.com/api/v10/gateway  ← network time
3. pm2 monit                             ← CPU/Memory ของ bot
```

---

### 🔴 User ได้ DM ซ้ำ (คนละ UUID)

Backend อาจส่ง event ซ้ำ 2 ครั้งโดยใช้ UUID ใหม่ทุกครั้ง → dedup ป้องกันไม่ได้

**Root cause:** backend retry ใช้ UUID ใหม่แทนที่จะใช้ UUID เดิม

**Fix ฝั่ง backend:** Retry ต้องส่ง `eventId` UUID เดิมเสมอ — bot จะ dedup ให้อัตโนมัติ

---

## 3.4 Security

### Webhook Authentication

ทุก request ต้องมี header:
```
X-Webhook-Secret: <ค่าใน WEBHOOK_SECRET>
```

ถ้าไม่ตรง → 401 ทันที ไม่มีการประมวลผลใดๆ

> **❌ ห้าม:** commit `.env` ขึ้น git / share secret ใน chat
> **✅ แนะนำ:** Rotate secret ทุก 90 วัน หรือเมื่อ team member ออก

### สิ่งที่ Log ได้และไม่ได้

| Data | Log? | เหตุผล |
|---|:---:|---|
| `eventId`, `type`, `outcome`, `latency_ms` | ✅ | ปลอดภัย — no PII |
| `discordUserId` | ✅ ⚠️ | User identifier — ถือเป็น PII |
| `deviceId`, `deviceName`, `userId` | ❌ | ไม่ log (เฉพาะตอน error) |
| `WEBHOOK_SECRET` | ❌ | ห้าม log เด็ดขาด |
| Full payload | ❌ | เฉพาะ Zod error จะ log `issues` |

หากต้องการ redact `discordUserId` ใน logs:
```typescript
// lib/logger.ts
const logger = pino({
  redact: ['discordUserId', 'adminId'],
});
```

---

# ส่วนที่ 4 — ข้อมูลอ้างอิง

## 4.1 Webhook Event Schema

### Base Fields (ทุก event ต้องมี)

| Field | Type | Required | หมายเหตุ |
|---|---|:---:|---|
| `eventId` | `string` (UUID v4) | ✅ | ใช้สำหรับ dedup |
| `timestamp` | `string` (ISO 8601) | ✅ | เช่น `2026-05-22T10:30:00.000Z` |
| `discordUserId` | `string` | optional | ถ้ามี bot ส่ง user DM ด้วย |

### Payload ครบทุก Event

<details>
<summary><strong>📱 session_start</strong></summary>

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-05-22T10:30:00.000Z",
  "type": "session_start",
  "discordUserId": "515550480680615937",
  "deviceId": "device-abc123",
  "deviceName": "iPhone 13 Pro",
  "userId": "user-mongo-id"
}
```
</details>

<details>
<summary><strong>⏱️ session_end</strong></summary>

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2026-05-22T11:30:00.000Z",
  "type": "session_end",
  "discordUserId": "515550480680615937",
  "deviceId": "device-abc123",
  "deviceName": "iPhone 13 Pro",
  "userId": "user-mongo-id",
  "durationSeconds": 3600
}
```
</details>

<details>
<summary><strong>⚠️ session_warning</strong> (ส่ง 2 ครั้ง: remainingSeconds 300 + 0)</summary>

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440002",
  "timestamp": "2026-05-22T11:25:00.000Z",
  "type": "session_warning",
  "discordUserId": "515550480680615937",
  "deviceId": "device-abc123",
  "deviceName": "iPhone 13 Pro",
  "userId": "user-mongo-id",
  "remainingSeconds": 300
}
```
</details>

<details>
<summary><strong>🔴 device_offline</strong></summary>

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440003",
  "timestamp": "2026-05-22T09:00:00.000Z",
  "type": "device_offline",
  "deviceId": "device-abc123",
  "deviceName": "iPhone 13 Pro"
}
```
> ไม่มี `userId` — device event ไม่ผูกกับ user คนใดคนหนึ่ง
</details>

<details>
<summary><strong>🟢 device_online</strong></summary>

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440004",
  "timestamp": "2026-05-22T09:05:00.000Z",
  "type": "device_online",
  "deviceId": "device-abc123",
  "deviceName": "iPhone 13 Pro"
}
```
</details>

### Field Matrix (สรุปทุก event)

| Field | session_start | session_end | session_warning | device_offline | device_online |
|---|:---:|:---:|:---:|:---:|:---:|
| `eventId` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `timestamp` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `discordUserId` | opt | opt | opt | opt | opt |
| `deviceId` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `deviceName` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `userId` | ✅ | ✅ | ✅ | — | — |
| `durationSeconds` | — | ✅ | — | — | — |
| `remainingSeconds` | — | — | ✅ | — | — |

### HTTP Request Format

```http
POST /webhook HTTP/1.1
Host: <bot-host>:4001
Content-Type: application/json
X-Webhook-Secret: <shared-secret>

{ ...payload }
```

---

## 4.2 Testing

### Postman Collection

ไฟล์: `discord-bot/postman/boxphone-discord-bot.postman_collection.json`
— 16 requests, 5 folders (session / device / edge cases / health / misc)

**ตั้ง environment ใน Postman:**
- `host` → `http://localhost:4001`
- `secret` → ค่าจาก `discord-bot/.env`
- `discordUserId` → Discord ID ของคุณ

### Test ด้วย PowerShell (Windows)

```powershell
$secret = "your-webhook-secret"
$discordId = "your-discord-user-id"
$headers = @{ "Content-Type" = "application/json"; "x-webhook-secret" = $secret }
$ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

# session_start
$body = @{
  eventId = [guid]::NewGuid().ToString()
  timestamp = $ts; type = "session_start"
  discordUserId = $discordId; deviceId = "dev-001"
  deviceName = "ทดสอบ"; userId = "user-001"; durationSeconds = 3600
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:4001/webhook -Method Post -Headers $headers -Body $body
```

### Test ด้วย curl (Linux/Mac)

```bash
curl -X POST http://localhost:4001/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $WEBHOOK_SECRET" \
  -d "{
    \"eventId\": \"$(uuidgen)\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"type\": \"session_start\",
    \"discordUserId\": \"YOUR_DISCORD_ID\",
    \"deviceId\": \"dev-001\",
    \"deviceName\": \"ทดสอบ\",
    \"userId\": \"user-001\"
  }"
```

### E2E Test Coverage (สถานะ 2026-05-22)

| Test | Scenario | ผล |
|---|---|:---:|
| Happy path — 5 events | session_start/end/warning + device_offline/online | ✅ PASS |
| B1 | ไม่มี discordUserId → admin DM only | ✅ PASS |
| B2 | unknown event type → 400 Zod reject | ✅ PASS |
| B3 | retry 3× same UUID → 1 DM only (dedup) | ✅ PASS |
| B4 | fake Discord ID → DiscordAPIError 10013 caught | ✅ PASS |
| B5 | wrong secret → 401 | ✅ PASS |

---

## 4.3 Known Issues & Backlog

### ⚠️ Limitations ที่ยอมรับแล้ว

| # | ปัญหา | ผลกระทบ | Acceptance |
|:---:|---|---|---|
| 1 | Dedup in-memory — ลืมเมื่อ restart | Bot restart + backend retry ภายใน 60s → DM ซ้ำ | Q14 ยอมรับ |
| 2 | Admin คนเดียว (จาก `.env`) | Admin หลายคนรองรับไม่ได้ | Backlog item |
| 3 | ไม่มี persistent queue | Discord API down → event หาย | Q14 ยอมรับ |
| 4 | ไม่มี per-user rate limit | — | Q15 ไม่ต้องการ |

### 📋 Backlog Items

| Priority | งาน | Effort |
|:---:|---|:---:|
| 🟡 Medium | Migrate admin จาก `.env` → DB query `role: ADMIN` | 2-3 ชม. |
| 🟢 Low | Unit tests สำหรับ `auth.ts`, `dedup.ts`, `events.ts` | 4 ชม. |
| 🟢 Low | Pino `redact` สำหรับ `discordUserId` ใน production | 30 นาที |
| 🟢 Low | Persistent dedup ผ่าน Redis | 1 วัน |

---

## 4.4 Architecture Decisions

| วันที่ | Decision | เหตุผล |
|---|---|---|
| 2026-04-29 | ไม่ขอ Administrator permission | ใช้แค่ Send Messages + Embed Links |
| 2026-04-29 | Intent = `Guilds` เท่านั้น | DM ผ่าน REST API ไม่ต้อง gateway intent |
| 2026-05-12 | OAuth ใช้ raw axios แทน `passport-discord` | ลด dependency, callback flow ง่ายกว่า |
| 2026-05-13 | WebhookEmitterService inject 4 จุดใน NestJS | session_start/end/warning + device events |
| 2026-05-18 | Rebase onto main แทน merge | Linear history, conflict ครั้งเดียว |
| 2026-05-21 | ลบ `payment_received` + `payment_failed` | Backend ไม่มี emitter เลย — dead code |
| 2026-05-22 | เพิ่ม `outcome` + `latency_ms` ใน logs | Observability สำหรับ handoff |

---

## 4.5 Escalation & Ownership

### Ownership

| Component | Owner |
|---|---|
| Discord Bot (`discord-bot/`) | **FullStack Force** (หลัง handoff) |
| Backend WebhookEmitterService | FullStack Force |
| Discord Application + Bot Token | DevOps + admin คนแรก |
| Production server | DevOps |

### Escalation Path

```
มีปัญหา?
    │
    ├─► 1. อ่าน Section 3.3 Troubleshooting
    │
    ├─► 2. ตรวจ logs:  pm2 logs boxphone-discord-bot --lines 100
    │
    ├─► 3. Restart:    pm2 restart boxphone-discord-bot
    │
    ├─► 4. ยังไม่หาย → ติดต่อ Sunshine050 (Phase 3 developer)
    │
    └─► 5. Discord ปัญหา → https://discordstatus.com/
```

**Links:**
- Repo: https://github.com/Sunshine050/boxphone-project
- Branch: `feature/discord-notification`
- Discord Developer Portal: https://discord.com/developers/applications

---

## 4.6 Reference Documents

### Source Code ใน Repo

| Path | คำอธิบาย |
|---|---|
| `discord-bot/src/` | Source code ทั้งหมด |
| `discord-bot/.env.example` | Template env vars |
| `discord-bot/postman/` | Postman collection (16 requests) |
| `discord-bot/README.md` | Setup guide + API reference |
| `ecosystem.config.js` | PM2 config (root) |
| `docs/DISCORD-BOT-RUNBOOK.md` | ไฟล์นี้ |

### ชื่อโปรเจกต์

> **BoxPhone** คือชื่อ product (แอป) — **MyrealPhone** คือชื่อ system/บริษัท ทั้งสองชื่ออ้างถึงระบบเดียวกัน ใน codebase ใช้ `boxphone-` เป็น prefix

---

<div align="center">

**— End of Runbook —**

*หากพบข้อผิดพลาดหรือข้อมูลหายไป แก้ไฟล์นี้ใน repo และ commit ทับได้เลย*

</div>
