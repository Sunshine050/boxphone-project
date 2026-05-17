# SCRCPY H.264 Streaming — Setup & Deploy Guide

ระบบเปลี่ยน "screenshot polling 0.5 FPS" → "H.264 video stream 30 FPS"
- ใช้ scrcpy-server.jar v2.4 + adb + WebCodecs API
- Real-time (latency 100-200ms) — เท่ากับ Xiaowei PC client
- รันคู่กับระบบเดิม (feature flag ผ่าน env `STREAMING_MODE`)

---

## สถาปัตยกรรม

```
Browser (Chrome/Edge 94+)
   ↕ WebSocket (Socket.IO)
   ↕ binary H.264 NAL units
NestJS Backend (ScrcpyService + AppGateway)
   ↕ TCP socket via adb forward
   ↕ adb push scrcpy-server.jar + spawn app_process
Android Device (USB)
   └─ scrcpy-server → MediaCodec hardware H.264 encoder
```

---

## Files ที่เปลี่ยน

| File | Role |
|------|------|
| `backend/assets/scrcpy-server-v2.4` | scrcpy-server.jar binary (~67 KB) |
| `backend/src/modules/devices/scrcpy.service.ts` | Lifecycle + protocol parser |
| `backend/src/gateway/app.gateway.ts` | `stream_subscribe` / `stream_unsubscribe` events |
| `backend/src/modules/devices/devices.controller.ts` | `GET /devices/streaming-mode` endpoint |
| `user/components/h264-player.tsx` | WebCodecs decoder + canvas render |
| `user/components/session-phone-control.tsx` | Conditional render scrcpy/screenshot |
| `user/lib/socket-client.ts` | `getStreamSocket()` แยกจาก notification socket |
| `ecosystem.config.js` | staging app instances port 3032/3010/3011 |
| `scripts/download-scrcpy-server.js` | ดาวน์โหลด jar จาก GitHub releases |

---

## Environment Variables

```env
# Feature flag (default: 'screenshot' — ปลอดภัย)
STREAMING_MODE=scrcpy

# H.264 quality
SCRCPY_VIDEO_BITRATE=3000000   # 3 Mbps
SCRCPY_MAX_FPS=30
SCRCPY_MAX_SIZE=1280            # resize ฝั่ง Android ก่อน encode

# Port allocation (adb forward host port pool)
SCRCPY_PORT_POOL_START=27183
SCRCPY_PORT_POOL_SIZE=100

# Lifecycle
SCRCPY_IDLE_TIMEOUT_MS=30000   # ปิด scrcpy หลัง 30s ไม่มี subscriber
MAX_CONCURRENT_STREAMS=20

# scrcpy-server.jar version
SCRCPY_SERVER_VERSION=2.4

# ADB executable (Windows server)
ADB_PATH=C:\Program Files (x86)\xiaowei_android\tools\adb.exe
```

---

## Deploy ครั้งแรก (บน Server PC Windows)

### 1. Pull code

```powershell
cd C:\path\to\boxphone-project
git fetch origin
git checkout feature/scrcpy-streaming
git pull
```

### 2. ตรวจสอบ scrcpy-server.jar

```powershell
# Verify file exists (commit'd in repo)
dir backend\assets\scrcpy-server-v2.4

# ถ้าไม่มี — download
node scripts\download-scrcpy-server.js
```

### 3. Build backend + frontends

```powershell
cd backend
npm install
npm run build

cd ..\user
npm install
npm run build

cd ..\admin
npm install
npm run build
```

### 4. Verify adb

```powershell
adb version       # ต้อง 1.0.41+
adb devices       # ต้องเห็นรายการ device USB
```

### 5. Start staging (port 3032/3010/3011) คู่กับ production

```powershell
cd C:\path\to\boxphone-project
pm2 start ecosystem.config.js --only boxphone-backend-staging,boxphone-admin-staging,boxphone-user-staging
pm2 save
pm2 logs boxphone-backend-staging --lines 100
```

ตรวจ log ว่ามีบรรทัด `STREAMING_MODE=scrcpy enabled` และ `adb forward cleanup` ทำงาน

### 6. Test 1 device

เปิด browser: `http://<server-pc-ip>:3011` (staging user app)
1. Login
2. เปิด session กับ device
3. ตรวจ DevTools Network → ต้องเห็น WebSocket binary frames
4. ตรวจ DevTools Console → ต้องเห็น `[H264Player] decoder configured avc1.xxxxxx`
5. หน้าจอควรลื่น 30 FPS, touch ควรตอบเร็ว <200ms

---

## Rollback (กรณีพัง)

ทุก case rollback ได้ภายใน 1 นาที — production ไม่เคยถูกแตะ

```powershell
# Option A: หยุด staging (production ยังรันอยู่)
pm2 stop boxphone-backend-staging boxphone-user-staging boxphone-admin-staging

# Option B: เปลี่ยน mode ใน .env แล้ว restart
# ใน ecosystem.config.js แก้ STREAMING_MODE: 'screenshot'
pm2 restart boxphone-backend-staging --update-env

# Option C: revert branch
git checkout main
pm2 reload ecosystem.config.js
```

---

## Troubleshooting

### "scrcpy-server.jar not found"
```powershell
node scripts\download-scrcpy-server.js
```

### "adb forward cleanup failed"
- เกิดจาก adb daemon ไม่รัน — `adb start-server` แล้ว restart backend
- ถ้ายังพัง: `adb kill-server` + `adb start-server` + `pm2 restart`

### Browser console: "VideoDecoder is not defined"
- ใช้ Chrome/Edge 94+ — ไม่รองรับ Firefox/Safari ปัจจุบัน
- ระบบจะ fallback กลับเป็น screenshot polling อัตโนมัติ

### Stream เริ่มต้นช้า (1-2 วินาที)
- ปกติ — รอ scrcpy push jar + spawn server + bind socket (~800ms)
- รอบที่สอง subscriber จะเร็วกว่า (cached config + stream already running)

### Stream กระตุก / drop frames
- ลด `SCRCPY_VIDEO_BITRATE` เหลือ 1500000 (1.5 Mbps)
- ลด `SCRCPY_MAX_FPS` เหลือ 20
- ตรวจ network: ที่ browser หลังควรเห็น throughput ~3 Mbps ต่อ stream

### "Reached MAX_CONCURRENT_STREAMS"
- ปรับ `MAX_CONCURRENT_STREAMS` ใน ecosystem.config.js (default 20)
- ตรวจว่า CPU/RAM ของ server PC รับไหวก่อนเพิ่ม

### scrcpy server ค้างบน Android
- Backend onModuleInit จะ `adb forward --remove-all` ตอน start — clean เอง
- ถ้าจำเป็น manual cleanup: `adb shell pkill -f com.genymobile.scrcpy.Server`

### Touch ทำงานช้า/ไม่ทำงาน
- Touch ไม่ผ่าน scrcpy — ใช้ POST /input ปกติ (adb shell input tap)
- ถ้า touch lag = adb daemon overloaded — ดู `adb devices` ว่า health OK
- coordinate mapping ใช้ `H264Player.getNaturalSize()` — ต้องรอ stream_metadata ก่อน touch จะ map ถูก

---

## Monitoring

### ดู active streams ใน backend

```powershell
curl http://localhost:3032/devices/streaming-mode -H "Cookie: access_token=..."
```

Response:
```json
{
  "mode": "scrcpy",
  "codec": "avc1.42E01E",
  "activeStreams": [
    { "serial": "276b135d13217ece", "port": 27183, "subscribers": 2, "status": "running" }
  ]
}
```

### Log patterns ที่ควรเห็น
- `[ScrcpyService] STREAMING_MODE=scrcpy enabled — bitrate=3000000 fps=30 max-size=1280`
- `[ScrcpyService] scrcpy stream live for <serial> on port 27183`
- `[ScrcpyService] [scrcpy/<serial>] meta: name="..." 1080x2400`
- `[ScrcpyService] Subscribed <socket-id> → <serial> (total subscribers: 1)`

### Log patterns ที่บ่งบอกปัญหา
- `scrcpy-server.jar missing` — ดู `download-scrcpy-server.js`
- `socket error: ECONNREFUSED` — scrcpy server ไม่ start (Android disconnect?)
- `connect to scrcpy on :PORT failed after 8x` — port forward fail / server crash
- `Reached MAX_CONCURRENT_STREAMS` — เกิน throttle, ลด concurrent หรือเพิ่ม MAX

---

## Promote staging → production (เมื่อทดสอบเสถียร)

1. รัน staging ทดสอบ 3-7 วัน, observe metrics
2. เมื่อพอใจ → switch production app ใน `ecosystem.config.js`:
   ```js
   env_production: {
     STREAMING_MODE: 'scrcpy',  // เปลี่ยนจาก 'screenshot'
     // + เพิ่ม SCRCPY_* env vars
   }
   ```
3. `pm2 reload boxphone-backend --update-env`
4. ถ้าพัง → `pm2 restart boxphone-backend` กลับมาด้วย env `STREAMING_MODE=screenshot` (backup)
5. เมื่อมั่นใจแล้ว → ลบ staging instances

---

## ขั้นตอนถัดไป (Phase 2)

- [ ] Admin grid (`overview-phone-grid.tsx`, `available-devices-grid.tsx`) — อัปเดตให้ใช้ scrcpy
- [ ] Multi-quality stream (admin grid ใช้ low-bitrate, user ใช้ full)
- [ ] WebRTC SFU layer (รองรับ >50 subscribers พร้อมกัน)
- [ ] Auto-reconnect with exponential backoff
- [ ] Frame timing metrics (Prometheus)
