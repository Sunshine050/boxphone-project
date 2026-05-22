# 🚀 BoxPhone Discord Bot — คู่มือ Deploy Production

<table>
<tr><td><strong>เวอร์ชัน</strong></td><td>1.0</td><td><strong>วันที่</strong></td><td>2026-05-22</td></tr>
<tr><td><strong>สำหรับ</strong></td><td>Senior Dev / DevOps ที่รับ handover</td><td><strong>Port</strong></td><td><code>4001</code></td></tr>
</table>

> **อ่านก่อน:** คู่มือนี้ครอบคลุมทุกวิธีการ deploy — เลือกอ่านเฉพาะ Path ที่ตรงกับ infrastructure ของคุณ

---

## สารบัญ

- [1. ภาพรวมระบบ](#1-ภาพรวมระบบ)
- [2. สิ่งที่ต้องเตรียมก่อน deploy ทุก Path](#2-สิ่งที่ต้องเตรียมก่อน-deploy-ทุก-path)
- [3. Path A — VPS เดียว (แนะนำ)](#3-path-a--vps-เดียว-แนะนำ)
- [4. Path B — VPS แยก bot ออกจาก backend](#4-path-b--vps-แยก-bot-ออกจาก-backend)
- [5. Path C — Docker Container](#5-path-c--docker-container)
- [6. Path D — PaaS (Railway / Render / Fly.io)](#6-path-d--paas-railway--render--flyio)
- [7. การตั้งค่า Backend ให้ชี้มาที่ Bot](#7-การตั้งค่า-backend-ให้ชี้มาที่-bot)
- [8. Firewall & Network](#8-firewall--network)
- [9. SSL / Reverse Proxy](#9-ssl--reverse-proxy)
- [10. Secrets Management](#10-secrets-management)
- [11. Monitoring & Uptime Alert](#11-monitoring--uptime-alert)
- [12. การ Redeploy หลังแก้ Code](#12-การ-redeploy-หลังแก้-code)
- [13. Go-Live Checklist](#13-go-live-checklist)

---

## 1. ภาพรวมระบบ

```
Internet
    │
    ▼
NestJS Backend (port 3031)
    │  POST /webhook
    │  Header: X-Webhook-Secret
    ▼
Discord Bot (port 4001)  ←── ไม่ควร expose port นี้ออก internet
    │  Discord DM
    ▼
Discord API → User + Admin
```

**สิ่งสำคัญ:**
- Bot ต้องเชื่อมต่อ internet ออกได้ (ส่ง DM ไป Discord API)
- Backend เรียก bot ผ่าน HTTP ภายใน — **port 4001 ไม่ต้อง expose ออก internet**
- Bot เป็น long-running process — **ห้ามใช้ Serverless** (Lambda, Cloud Functions ใช้ไม่ได้)

---

## 2. สิ่งที่ต้องเตรียมก่อน deploy ทุก Path

### 2.1 Discord Bot Token

1. ไปที่ https://discord.com/developers/applications → เลือก **BoxPhone Bot**
2. Sidebar → **Bot** → **Reset Token** → copy token
3. เก็บไว้ใช้ใส่ใน `DISCORD_BOT_TOKEN`

> ⚠️ Reset token ทำให้ instance เดิม disconnect ทันที — reset ตอนที่ bot ไม่ได้ใช้งาน

### 2.2 Admin Discord User ID

1. Discord → User Settings → Advanced → เปิด **Developer Mode**
2. คลิกขวาที่ชื่อ admin → **Copy User ID**
3. ต้องเป็นตัวเลข 17-19 หลัก เช่น `515550480680615937`

### 2.3 Webhook Secret

สร้าง random secret ที่ปลอดภัย — **ต้องใช้ค่าเดียวกันทั้ง bot และ backend**

```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
[Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLower()
```

บันทึกค่านี้ไว้ ต้องใส่ใน:
- `discord-bot/.env` → `WEBHOOK_SECRET=<ค่านี้>`
- `backend/.env` → `DISCORD_WEBHOOK_SECRET=<ค่านี้>` (ชื่อ key ต่างกัน แต่ค่าต้องเหมือนกัน)

---

## 3. Path A — VPS เดียว 

> **เหมาะกับ:** เริ่มต้น production, infrastructure ไม่ซับซ้อน
> **ข้อดี:** ง่ายที่สุด, backend เรียก bot ผ่าน `localhost` ไม่ต้องตั้งค่าเพิ่ม
> **ข้อเสีย:** ทุกอย่างอยู่เครื่องเดียว, ถ้าเครื่องล่ม = ทุก service ล่ม

### 3.1 Spec ขั้นต่ำ

| Resource | ขั้นต่ำ | แนะนำ |
|---|---|---|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB | 2 GB |
| Storage | 20 GB | 40 GB |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

Provider ที่ใช้ได้: DigitalOcean, Linode/Akamai, Vultr, AWS EC2 t3.micro, GCP e2-micro

### 3.2 ขั้นตอน

```bash
# 1. เข้าถึง server ผ่าน SSH
ssh user@<server-ip>

# 2. ติดตั้ง Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# ตรวจสอบ
node --version   # v20.x.x
npm --version    # 10.x.x

# 3. ติดตั้ง PM2
npm install -g pm2

# 4. Clone repo
git clone https://github.com/Sunshine050/boxphone-project.git
cd boxphone-project

# 5. ติดตั้ง dependencies
cd discord-bot
npm install
cd ..

# 6. สร้าง .env
cp discord-bot/.env.example discord-bot/.env
nano discord-bot/.env
```

**กรอกค่าใน `.env`:**

```env
DISCORD_BOT_TOKEN=<token จาก step 2.1>
WEBHOOK_SECRET=<secret จาก step 2.3>
ADMIN_DISCORD_ID=<user id จาก step 2.2>
PORT=4001
NODE_ENV=production
LOG_LEVEL=info
DEDUP_WINDOW_MS=60000
```

```bash
# 7. Build
cd discord-bot
npm run build
cd ..

# 8. สร้าง logs directory
mkdir -p logs

# 9. Start ด้วย PM2
pm2 start ecosystem.config.js --only boxphone-discord-bot --env production

# 10. ตรวจสอบว่าทำงาน
curl http://localhost:4001/health
# ต้องได้: {"status":"ok","botReady":true}

# 11. ตั้ง auto-start เมื่อ server reboot
pm2 save
pm2 startup
# ทำตามคำสั่งที่ขึ้นมา (มักเป็น sudo คำสั่งหนึ่ง)

# 12. ตั้ง log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### 3.3 Backend URL ที่ใช้

เมื่อ backend และ bot อยู่เครื่องเดียวกัน:
```
http://localhost:4001/webhook
```
→ ดู [Section 7](#7-การตั้งค่า-backend-ให้ชี้มาที่-bot) สำหรับวิธีตั้งค่า backend

---

## 4. Path B — VPS แยก bot ออกจาก backend

> **เหมาะกับ:** ต้องการ scale แต่ละ service แยกกัน, หรือ backend อยู่คนละ provider
> **ข้อดี:** isolate failure, scale ได้อิสระ
> **ข้อเสีย:** ต้องตั้งค่า internal network, ซับซ้อนกว่า Path A

### 4.1 Architecture

```
VM-1 (Backend)          VM-2 (Discord Bot)
port 3031 (public)      port 4001 (internal เท่านั้น)
     │                        ▲
     └────── POST /webhook ───┘
             private IP / VPN
```

### 4.2 ขั้นตอน

**บน VM-2 (bot server):** ทำตาม Path A section 3.2 ทุกอย่าง

**ตั้ง Firewall บน VM-2:**

```bash
# อนุญาตเฉพาะ backend IP เข้า port 4001
# แทน <backend-private-ip> ด้วย private IP ของ VM-1

# UFW (Ubuntu)
sudo ufw allow from <backend-private-ip> to any port 4001
sudo ufw deny 4001   # block อื่น
sudo ufw enable
```

หรือถ้าใช้ Cloud provider (AWS/GCP/DigitalOcean):
- Security Group / Firewall Rules: allow port 4001 จาก `<backend-private-ip>` เท่านั้น
- ห้าม allow 0.0.0.0/0 เข้า port 4001

**Backend URL ที่ใช้:**
```
http://<bot-private-ip>:4001/webhook
```

> ⚠️ **ใช้ private IP** ไม่ใช่ public IP — ปลอดภัยกว่าและถูกกว่า (ไม่ผ่าน internet)
> ถ้าอยู่คนละ provider ที่ไม่มี private network ร่วมกัน → ใช้ WireGuard VPN หรือ Path A แทน

---

## 5. Path C — Docker Container

> **เหมาะกับ:** ทีมที่ใช้ container workflow, deploy บน Kubernetes หรือ ECS
> **ข้อดี:** portable, reproducible, ง่ายต่อการ CI/CD
> **ข้อเสีย:** ต้องมี Docker runtime, ต้องจัดการ secrets ผ่าน env inject

### 5.1 สร้าง Dockerfile

สร้างไฟล์ `discord-bot/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 4001
CMD ["node", "dist/server.js"]
```

### 5.2 Build และ Run

```bash
# Build image
cd discord-bot
docker build -t boxphone-discord-bot:latest .

# Run (ส่ง env vars ตรง)
docker run -d \
  --name boxphone-discord-bot \
  --restart unless-stopped \
  -p 127.0.0.1:4001:4001 \
  -e DISCORD_BOT_TOKEN="<token>" \
  -e WEBHOOK_SECRET="<secret>" \
  -e ADMIN_DISCORD_ID="<id>" \
  -e PORT=4001 \
  -e NODE_ENV=production \
  boxphone-discord-bot:latest

# ตรวจสอบ
curl http://localhost:4001/health
docker logs boxphone-discord-bot
```

> **สำคัญ:** `-p 127.0.0.1:4001:4001` bind เฉพาะ localhost — port ไม่ expose ออก internet

### 5.3 Docker Compose (ถ้ารัน backend + bot พร้อมกัน)

สร้าง `docker-compose.yml` ที่ root:

```yaml
services:
  discord-bot:
    build:
      context: ./discord-bot
    restart: unless-stopped
    environment:
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
      - WEBHOOK_SECRET=${WEBHOOK_SECRET}
      - ADMIN_DISCORD_ID=${ADMIN_DISCORD_ID}
      - PORT=4001
      - NODE_ENV=production
    ports:
      - "127.0.0.1:4001:4001"
    networks:
      - internal

  # เพิ่ม backend service ที่นี่ถ้ามี

networks:
  internal:
    driver: bridge
```

ใส่ค่าใน `.env` ที่ root แล้วรัน:
```bash
docker compose up -d
```

---

## 6. Path D — PaaS (Railway / Render / Fly.io)

> **เหมาะกับ:** ไม่อยากจัดการ server เอง, deploy ไวจาก git push
> **ข้อดี:** ไม่ต้องดูแล OS/infra, auto-deploy จาก git
> **ข้อเสีย:** ค่าใช้จ่ายสูงกว่า VPS, ต้องตั้งค่า secrets ผ่าน dashboard

> ⚠️ **ข้อควรระวัง:** บาง PaaS free tier sleep container เมื่อไม่มี traffic — bot จะ disconnect จาก Discord ต้องใช้ paid plan เพื่อให้ always-on

### 6.1 Railway

1. สร้างบัญชีที่ https://railway.app
2. New Project → Deploy from GitHub repo → เลือก `boxphone-project`
3. **Root Directory:** ตั้งเป็น `discord-bot`
4. **Start Command:** `node dist/server.js`
5. **Build Command:** `npm run build`
6. Variables → เพิ่มทุกตัวจาก section 2:
   - `DISCORD_BOT_TOKEN`
   - `WEBHOOK_SECRET`
   - `ADMIN_DISCORD_ID`
   - `PORT=4001`
   - `NODE_ENV=production`
7. Settings → Networking → เพิ่ม port `4001`
8. Deploy

**URL ที่ backend จะเรียก:**
```
https://<project>.up.railway.app/webhook
```

### 6.2 Render

1. https://render.com → New → Web Service
2. Connect GitHub repo → เลือก `boxphone-project`
3. **Root Directory:** `discord-bot`
4. **Build Command:** `npm install && npm run build`
5. **Start Command:** `node dist/server.js`
6. **Instance Type:** Starter ($7/mo) — ไม่ใช้ Free (sleep ทุก 15 นาที)
7. Environment Variables → เพิ่มค่าจาก section 2
8. Create Web Service

### 6.3 Fly.io

```bash
# ติดตั้ง flyctl
curl -L https://fly.io/install.sh | sh

cd discord-bot

# สร้าง fly.toml
fly launch --name boxphone-discord-bot --no-deploy

# ตั้ง secrets
fly secrets set DISCORD_BOT_TOKEN="<token>"
fly secrets set WEBHOOK_SECRET="<secret>"
fly secrets set ADMIN_DISCORD_ID="<id>"
fly secrets set NODE_ENV="production"

# Deploy
fly deploy
```

แก้ `fly.toml` ที่สร้างมา:
```toml
[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 4001
  force_https = true
  auto_stop_machines = false   # สำคัญ: ห้าม auto-stop
  auto_start_machines = true
```

---

## 7. การตั้งค่า Backend ให้ชี้มาที่ Bot

> **สิ่งที่ docs ไม่ได้บอก:** backend ใช้ env var อะไรเก็บ URL ของ bot

ตรวจสอบ `backend/.env.example` หา variable ที่มีชื่อเกี่ยวกับ discord/webhook/bot เช่น:

```env
# ตัวอย่าง — ชื่อจริงต้องตรวจจาก backend/.env.example
DISCORD_BOT_URL=http://localhost:4001
DISCORD_WEBHOOK_SECRET=<ค่าเดียวกับ WEBHOOK_SECRET ใน bot>
```

| Deploy Path | ค่าที่ต้องใส่ใน backend |
|---|---|
| Path A (เครื่องเดียวกัน) | `http://localhost:4001` |
| Path B (VPS แยก, private network) | `http://<bot-private-ip>:4001` |
| Path B (VPS แยก, ไม่มี private network) | `http://<bot-public-ip>:4001` + ต้องเปิด firewall |
| Path C (Docker compose เดียวกัน) | `http://discord-bot:4001` (ชื่อ service) |
| Path D (PaaS) | `https://<bot-domain>/` |

---

## 8. Firewall & Network

### กฎที่ต้องตั้งสำหรับทุก Path

| Port | Direction | Allow from | เหตุผล |
|---|---|---|---|
| `4001` | Inbound | backend IP เท่านั้น | bot webhook endpoint |
| `443` / `80` | Outbound | 0.0.0.0/0 | bot ส่ง DM ไป Discord API |
| `3031` | Inbound | 0.0.0.0/0 | backend รับ traffic จาก user |

**ห้าม:** เปิด port 4001 ให้ 0.0.0.0/0 — ทุกคนบน internet จะส่ง webhook ปลอมเข้ามาได้

### ตรวจสอบ

```bash
# ตรวจว่า port 4001 ไม่ได้ expose ออก internet
# รันจากเครื่องอื่น (ไม่ใช่ server)
curl -v http://<server-public-ip>:4001/health
# ต้องได้ Connection refused หรือ timeout

# ตรวจจากภายใน server
curl http://localhost:4001/health
# ต้องได้ {"status":"ok","botReady":true}
```

---

## 9. SSL / Reverse Proxy

Bot ต้องการ SSL หรือไม่?

| กรณี | ต้องการ SSL? |
|---|---|
| Backend + bot เครื่องเดียวกัน (localhost) | ❌ ไม่ต้อง |
| Backend + bot คนละ VPS บน private network | ❌ ไม่ต้อง (traffic ใน private network) |
| Bot expose ผ่าน public internet (PaaS) | ✅ ต้อง (HTTPS) |
| Backend เรียก bot ผ่าน public IP | ✅ แนะนำ |

### ถ้าต้องการ HTTPS (nginx + Certbot)

```bash
sudo apt install nginx certbot python3-certbot-nginx

# สร้าง nginx config
sudo nano /etc/nginx/sites-available/discord-bot
```

```nginx
server {
    server_name bot.yourdomain.com;

    location / {
        proxy_pass http://localhost:4001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/discord-bot /etc/nginx/sites-enabled/
sudo certbot --nginx -d bot.yourdomain.com
sudo systemctl reload nginx
```

**Backend URL หลังตั้ง SSL:**
```
https://bot.yourdomain.com/webhook
```

---

## 10. Secrets Management

### ❌ อย่าทำ

```bash
# ห้าม commit .env ขึ้น git
git add discord-bot/.env   # ห้ามเด็ดขาด

# ห้ามส่ง secrets ทาง chat/Slack/email plain text
```

### ✅ วิธีที่ถูกต้องตาม Path

| Deploy Path | วิธีจัดการ Secrets |
|---|---|
| VPS (Path A/B) | ไฟล์ `.env` บน server — จำกัด permission `chmod 600 discord-bot/.env` |
| Docker (Path C) | ส่งผ่าน `docker run -e` หรือ Docker secrets |
| Railway (Path D) | ตั้งใน Variables dashboard |
| Render (Path D) | ตั้งใน Environment Variables |
| Fly.io (Path D) | `fly secrets set` |

### ตั้ง permission ไฟล์ .env (VPS)

```bash
chmod 600 discord-bot/.env
chown <deploy-user>:<deploy-user> discord-bot/.env
```

### Rotate Secrets

ควร rotate ทุก 90 วัน หรือเมื่อ team member ลาออก:

```bash
# สร้าง secret ใหม่
openssl rand -hex 32

# อัปเดตทั้ง bot และ backend .env พร้อมกัน
# แล้ว restart ทั้งคู่
pm2 restart boxphone-discord-bot
# restart backend ด้วย
```

---

## 11. Monitoring & Uptime Alert

### Health Check ที่ต้องตั้ง

ตรวจ endpoint นี้ทุก 60 วินาที:
```
GET http://localhost:4001/health
```

Expected response: `{"status":"ok","botReady":true}`

### เครื่องมือฟรี

| เครื่องมือ | วิธีตั้ง | แจ้งเตือนทาง |
|---|---|---|
| [UptimeRobot](https://uptimerobot.com) | เพิ่ม monitor URL (public endpoint ต้องมี) | Email, Discord, Slack |
| [Healthchecks.io](https://healthchecks.io) | cron ping | Email, Discord |
| cron + curl (บน server) | ดูด้านล่าง | Email / custom |

### Cron บน Server (ไม่ต้องใช้ service ภายนอก)

```bash
crontab -e
```

เพิ่มบรรทัดนี้:
```cron
* * * * * curl -sf http://localhost:4001/health | grep -q '"botReady":true' || (pm2 restart boxphone-discord-bot && echo "Bot restarted at $(date)" >> /var/log/bot-watchdog.log)
```

→ ตรวจทุก 1 นาที ถ้า `botReady` ไม่ใช่ `true` จะ restart อัตโนมัติ

### PM2 Monitoring

```bash
pm2 list              # ดูสถานะ
pm2 monit             # real-time CPU/RAM
pm2 logs boxphone-discord-bot --lines 50    # logs ล่าสุด
```

---

## 12. การ Redeploy หลังแก้ Code

```bash
# บน VPS
cd boxphone-project/discord-bot
git pull
npm install
npm run build
pm2 restart boxphone-discord-bot

# ตรวจสอบ
curl http://localhost:4001/health
pm2 logs boxphone-discord-bot --lines 20
```

### Zero-downtime reload (ถ้า traffic สำคัญ)

```bash
pm2 reload boxphone-discord-bot
```

> ⚠️ reload ไม่รับประกัน zero-downtime 100% สำหรับ Discord connection — bot จะ reconnect ภายใน ~5 วินาที

---

## 13. Go-Live Checklist

ทำเครื่องหมาย ✅ ทุกข้อก่อน go-live:

### Infrastructure
- [ ] Server/container รันอยู่และ `botReady: true`
- [ ] Port 4001 ไม่ได้ expose ออก internet
- [ ] Outbound port 443 เปิดอยู่ (bot ส่งหา Discord API)
- [ ] Auto-restart เมื่อ server reboot (`pm2 startup` หรือ container restart policy)
- [ ] Log rotation ตั้งแล้ว

### Configuration
- [ ] `DISCORD_BOT_TOKEN` ถูกต้องและไม่ expired
- [ ] `WEBHOOK_SECRET` ตรงกันทั้ง bot และ backend ทุกตัวอักษร
- [ ] `ADMIN_DISCORD_ID` เป็นตัวเลข 17-19 หลัก
- [ ] `PORT=4001` และ `NODE_ENV=production` ถูกต้อง
- [ ] ไฟล์ `.env` ไม่ได้อยู่ใน git (`.gitignore` ครอบแล้ว)

### Integration
- [ ] Backend ชี้มาที่ bot URL ที่ถูกต้อง (ดู Section 7)
- [ ] ทดสอบส่ง webhook จาก backend → ได้รับ DM จริง
- [ ] Admin ได้รับ DM ทดสอบ
- [ ] ทดสอบ event ทุก type อย่างน้อย 1 ครั้ง

### Monitoring
- [ ] Uptime monitor ตั้งแล้ว (แจ้งเตือนถ้า bot ล่ม)
- [ ] รู้วิธีดู logs: `pm2 logs boxphone-discord-bot`
- [ ] รู้วิธี restart: `pm2 restart boxphone-discord-bot`

### Escalation
- [ ] มีช่องทางติดต่อ Sunshine050 (Phase 3 developer) ถ้าต้องการ context เพิ่ม
- [ ] ทีมรู้ว่า Troubleshooting guide อยู่ที่ `docs/DISCORD-BOT-RUNBOOK.md` Section 3.3

---

## ❓ FAQ สำหรับ Senior Dev

**Q: Backend ใช้ env var ชื่ออะไรเก็บ URL ของ bot?**
→ ตรวจ `backend/.env.example` — มักชื่อ `DISCORD_BOT_URL` หรือ `DISCORD_WEBHOOK_URL` ถ้าไม่มีให้ค้นหา `4001` ใน source code ของ backend

**Q: Bot ต้องอยู่ใน Discord Server ไหมถึงส่ง DM ได้?**
→ ต้องอยู่ใน server เดียวกับ user อย่างน้อย 1 server ถ้า user ปิด DM จาก stranger

**Q: ถ้า bot crash แล้ว event หาย ทำยังไง?**
→ Limitation ที่ยอมรับแล้ว (documented ใน RUNBOOK 4.3) — ไม่มี persistent queue ใน version นี้ event ที่ส่งมาขณะ bot down จะหาย

**Q: Deploy บน AWS ควรใช้ service ไหน?**
→ EC2 t3.micro (Path A หรือ B) คือ option ที่ตรงที่สุดกับ docs ถ้าใช้ ECS/Fargate ต้องสร้าง Dockerfile เองตาม Path C

**Q: Rotate Discord Bot Token ทำยังไงไม่ให้ service interrupt?**
→ ต้องมี downtime สั้นๆ (~10 วินาที): Reset token → อัปเดต `.env` → `pm2 restart boxphone-discord-bot`

---

<div align="center">

**— End of Production Deploy Guide —**

*ไฟล์นี้เขียนขึ้นสำหรับ handover — ถ้าพบ gap ใหม่ให้เพิ่มใน Section 13 FAQ*

</div>
