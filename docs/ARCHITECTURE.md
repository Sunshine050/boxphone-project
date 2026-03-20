# BoxPhone — โครงสร้างระบบ (สำคัญ ห้ามลบ)

เอกสารนี้สรุปการทำงานของโปรเจกต์หลังจัดโมดูลและลด duplication — อ่านคู่กับ `README.md`, **`docs/DEPLOY.md`** และ `docs/SCREENSHOT-SETUP.md`

## โฟลเดอร์หลัก

| ส่วน | บทบาท |
|------|--------|
| `backend/` | NestJS — REST API, JWT + cookie, MongoDB, ADB screenshot/input, Xiaowei WS/HTTP |
| `admin/` | Next.js — แดชบอร์ดแอดมิน |
| `user/` | Next.js — แดชบอร์ดผู้ใช้ + Socket.IO แจ้งเตือน |
| `shared/` | โค้ดใช้ร่วมระหว่าง frontends (เช่น `getApiBaseUrl`) — import ผ่าน `@boxphon/shared/...` |

## Backend — โมดูล (Modular)

- **`AuthModule`** — login, JWT, CSRF, rate limit (ถ้ามี package)
- **`UsersModule`** — ผู้ใช้, แอดมิน seed ผ่าน `seed-admin.ts` + `main.ts`
- **`DevicesModule`** — อุปกรณ์, **Xiaowei** (HTTP + WebSocket), **`AdbScreenshotService`** (screencap cache + concurrent limit + `sendInput` tap/swipe/key/text)
- **`SessionsModule`** — เซสชันเวลา, cron cleanup, **พึ่งพา `DevicesModule`** เพื่อสั่ง ADB HOME เมื่อหมดเวลา (ไม่ duplicate shell เอง)
- **`NotificationModule`** — Socket.IO แจ้งเตือนผู้ใช้
- **`LogModule`** — บันทึกเหตุการณ์แอดมิน (ถ้าเปิดใช้ใน `AppModule`)

### API อุปกรณ์ / ภาพหน้าจอ

- `GET /devices` — รายการจาก DB เท่านั้น (ไม่มี mock device)
- `GET /devices/sync-from-xiaowei` — logic รวมที่ **`DevicesService.syncFromXiaowei`** — ไม่ทับสถานะ `UNDER_REPAIR` / `DAMAGED`
- `GET /devices/screenshot?serial=` และ `GET /devices/:id/screenshot` — ใช้ **`AdbScreenshotService.fetchScreenshotForSerial`** เดียวกัน
- ค่าคงที่ placeholder / default TTL อยู่ที่ `devices/constants/screenshot.constants.ts`
- ตรวจชนิด PNG: `devices/utils/screenshot-buffer.util.ts`

## Frontends

- **Base URL** มาจาก `shared/client/api-base-url.ts` — ลำดับ env: `NEXT_PUBLIC_API_BASE_URL` → `NEXT_PUBLIC_BACKEND_URL` → `NEXT_PUBLIC_API_URL`
- Next.js ตั้ง `experimental.externalDir: true` เพื่อ import จาก `../shared`
- `user/lib/socket-client.ts` ใช้ `getApiBaseUrl()` เดียวกับ REST client
- **`npm run build` (admin/user)** เรียก `./scripts/next-build-filtered.cjs` → `shared/scripts/run-next-build-filter-baseline-warn.cjs` เพื่อกรองข้อความ `[baseline-browser-mapping] … two months old` (ไม่กระทบผล build)
- **`npm run build:verbose`** — รัน `next build` ตรงๆ ถ้าต้องการ log เต็ม

## สิ่งที่ถูกลบ / รวมแล้ว (เทียบของเก่า)

- Mock device `mock_device_id_20_0000` ใน `DevicesService` — ลบแล้ว (ข้อมูลจริงต้อง sync/register จาก Xiaowei หรือ ADB)
- Logic sync ซ้ำใน `DevicesController` — เรียก service แทน
- Logic screenshot ซ้ำใน controller — ย้ายไป `AdbScreenshotService`
- คำสั่ง ADB HOME แยกใน `SessionsService` — ใช้ `AdbScreenshotService.sendInput`

## คุณภาพ / Clean code

- ธุรกิจอุปกรณ์อยู่ที่ **service**; controller บางลง
- ไม่ hardcode URL ฝั่ง client ในโค้ด — ใช้ env ผ่าน `getApiBaseUrl`
- Backend ยังอ่าน `ADB_PATH`, `SCREENSHOT_*` จาก `.env` ตามเดิม

---

*อัปเดตตามการรีแฟกเตอร์ modular — หากเพิ่มโมดูลใหม่ให้สรุปในไฟล์นี้*
