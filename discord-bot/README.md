# 🤖 BoxPhone Discord Notification Bot

ระบบแจ้งเตือน Discord สำหรับ MyrealPhone — รับ webhook จาก NestJS backend แล้วส่ง DM ไปหา user และ admin เมื่อเกิด event ในระบบ

> **คู่มือการดูแลระบบ Production:** ดู [`docs/DISCORD-BOT-RUNBOOK.md`](../docs/DISCORD-BOT-RUNBOOK.md) หรือ [`docs/DISCORD-BOT-RUNBOOK.docx`](../docs/DISCORD-BOT-RUNBOOK.docx)

---

## Event ที่รองรับ

| Event | เกิดเมื่อ |
|---|---|
| `session_start` | User เริ่ม session |
| `session_warning` | เหลือเวลา ≤ 5 นาที |
| `session_end` | Session สิ้นสุด |
| `device_offline` | Device ขาดการเชื่อมต่อ |
| `device_online` | Device กลับมา online |

---

## การติดตั้ง

### Prerequisites

- Node.js 20+ (LTS)
- npm 10+
- PM2 — ถ้ายังไม่มี: `npm install -g pm2`

```bash
# 0. Clone repo
git clone --branch feature/discord-notification https://github.com/Sunshine050/boxphone-project.git
cd boxphone-project/discord-bot

# 1. Install dependencies
npm install

# 2. สร้าง .env จาก template
cp .env.example .env
# แก้ค่าใน .env (ดูหัวข้อ Environment Variables)

# 3. Build
npm run build

# 4. สร้าง logs directory (PM2 จะ crash ถ้าไม่มี)
mkdir -p ../logs

# 5. Start bot
npm start
# หรือใช้ PM2 (production):
# pm2 start ecosystem.config.js --only boxphone-discord-bot --env production

# 6. ตรวจสอบ
curl http://localhost:4001/health
# {"status":"ok","botReady":true}
```

---

## Environment Variables

ไฟล์: `discord-bot/.env` **(ห้าม commit)**

| Variable | จำเป็น | คำอธิบาย |
|---|:---:|---|
| `DISCORD_BOT_TOKEN` | ✅ | Bot token จาก [Discord Developer Portal](https://discord.com/developers/applications) |
| `WEBHOOK_SECRET` | ✅ | Shared secret — ต้องตรงกับ `backend/.env` ทุกตัวอักษร |
| `ADMIN_DISCORD_ID` | ✅ | Discord User ID ของ admin (ตัวเลข 17-19 หลัก) |
| `PORT` | optional | HTTP port (default: `4000`, แนะนำ `4001`) |
| `LOG_LEVEL` | optional | `trace` / `debug` / `info` / `warn` / `error` (default: `info`) |
| `DEDUP_WINDOW_MS` | optional | หน้าต่างเวลา dedup (default: `60000` = 1 นาที) |
| `NODE_ENV` | optional | ตั้งเป็น `production` เพื่อเปิด JSON logs |

### หา Discord User ID

1. Discord → User Settings → Advanced → เปิด **Developer Mode**
2. คลิกขวาที่ user → **Copy User ID**

### สร้าง WEBHOOK_SECRET

```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
[Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLower()
```

---

## การรัน

### Development

```bash
npm run dev
# ts-node-dev — auto-reload + pino-pretty logs
```

### Production (PM2)

```bash
# จาก root ของ monorepo
pm2 start ecosystem.config.js --only boxphone-discord-bot --env production

# คำสั่งที่ใช้บ่อย
pm2 logs boxphone-discord-bot       # ดู logs
pm2 restart boxphone-discord-bot    # restart
pm2 stop boxphone-discord-bot       # stop
```

### ตรวจสอบ Health

```bash
curl http://localhost:4001/health
# {"status":"ok","botReady":true}
```

---

## Webhook API

### Endpoint

```
POST /webhook
Content-Type: application/json
X-Webhook-Secret: <WEBHOOK_SECRET>
```

### ตัวอย่าง Payload (session_start)

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-05-22T10:30:00.000Z",
  "type": "session_start",
  "discordUserId": "123456789012345678",
  "deviceId": "device-abc123",
  "deviceName": "iPhone 13 Pro",
  "userId": "user-mongo-id"
}
```

> **Schema ครบทุก event:** ดู [`docs/DISCORD-BOT-RUNBOOK.md#41-webhook-event-schema`](../docs/DISCORD-BOT-RUNBOOK.md#41-webhook-event-schema)

### Response Codes

| Code | ความหมาย |
|:---:|---|
| `200` `{"status":"ok"}` | DM ส่งสำเร็จ |
| `200` `{"status":"duplicate"}` | eventId ซ้ำ — dedup ป้องกัน |
| `400` | Payload ไม่ผ่าน schema validation |
| `401` | Webhook secret ผิด |
| `500` | Discord API error |

---

## การทดสอบ

### Postman

Import `postman/boxphone-discord-bot.postman_collection.json` (16 requests, 5 folders)

### PowerShell (Windows)

```powershell
$headers = @{ "Content-Type" = "application/json"; "x-webhook-secret" = "your-secret" }
$body = @{
  eventId       = [guid]::NewGuid().ToString()
  timestamp     = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  type          = "session_start"
  discordUserId = "your-discord-id"
  deviceId      = "dev-001"
  deviceName    = "ทดสอบ"
  userId        = "user-001"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:4001/webhook -Method Post -Headers $headers -Body $body
```

---

## โครงสร้างไฟล์

```
src/
├── server.ts              ← Entry point
├── lib/logger.ts          ← Pino structured logger
├── middleware/
│   ├── auth.ts            ← Webhook secret validation
│   └── dedup.ts           ← Event deduplication (in-memory, 60s)
├── types/events.ts        ← Zod schema สำหรับทุก event type
└── handlers/
    ├── embeds.ts          ← Discord embed builder
    ├── router.ts          ← Admin + user DM routing
    ├── admin.ts           ← Send DM to admin
    └── user.ts            ← Send DM to user
```

---

## Ports

| Service | Port |
|---|:---:|
| Backend (NestJS) | 3031 |
| Admin (Next.js) | 3000 |
| User (Next.js) | 3001 |
| **Discord Bot (this)** | **4001** |

---

## Links

- **Production Runbook:** [`docs/DISCORD-BOT-RUNBOOK.md`](../docs/DISCORD-BOT-RUNBOOK.md)
- **Repo:** https://github.com/Sunshine050/boxphone-project
- **Discord Developer Portal:** https://discord.com/developers/applications
