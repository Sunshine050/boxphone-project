# BoxPhone — คู่มือเตรียม Deploy (สำคัญ ห้ามลบ)

เอกสารนี้สรุป **สภาพแวดล้อม (env)** และ **การเรียก API** ให้พร้อม production (เช่น VPS Hetzner + Nginx + HTTPS)

> สำหรับ **ส่งมอบลูกค้า / คู่มือติดตั้งแบบไม่เน้นเทคนิค** ให้อ่าน **[CLIENT-DELIVERY-HANDBOOK.md](./CLIENT-DELIVERY-HANDBOOK.md)**

## สถาปัตยกรรมที่แนะนำ

| ชั้น | ตัวอย่าง |
|------|----------|
| Reverse proxy | Nginx (TLS ด้วย Let’s Encrypt) |
| Backend | NestJS `node dist/main.js` หรือ PM2 / Docker — พอร์ตภายใน เช่น `3031` |
| Admin / User | `next build` + `next start` (คนละพอร์ต) หรือ static export + Nginx ถ้าเหมาะ |
| MongoDB | เครื่องเดียวกับ API หรือ **MongoDB Atlas** |

**หมายเหตุ ADB:** มือถือต่อ USB ที่เครื่องออฟฟิศ/PC — บริการ screenshot/ADB มักรันที่เครื่องนั้น ไม่ใช่บน VPS คลาวด์

---

## 1) Backend (`backend/.env`)

คัดลอกจาก `backend/.env.example` → `.env`

| ตัวแปร | บังคับ | คำอธิบาย |
|--------|--------|----------|
| `NODE_ENV` | แนะนำ `production` | เปิด cookie `Secure`, CORS เข้ม |
| `PORT` | ใช่ | พอร์ตที่ Nest ฟัง (ภายใน) |
| `MONGO_URI` | ใช่ | connection string |
| `JWT_SECRET` | ใช่ | ความลับยาวพอ — ห้ามใช้ค่า default |
| `JWT_EXPIRATION` | optional | default `1d` |
| `CORS_ORIGINS` | **บังคับใน production** | URL ของ **user** และ **admin** คั่นด้วย comma ไม่มีช่องว่างส่วนเกิน |
| `TRUST_PROXY` | แนะนำ `true` | เมื่ออยู่หลัง Nginx (IP / rate limit) |
| `COOKIE_DOMAIN` | optional | ใช้เมื่อแยก subdomain แต่ต้องการคุกกี้ร่วม เช่น `.example.com` |
| `ADMIN_*` | seed แอดมิน | ตั้งรหัสแข็งแรงใน production |

**REST CORS** และ **Socket.IO** ใช้ **`CORS_ORIGINS` ชุดเดียวกัน** (ตั้งค่าผ่าน `ConfigurableSocketIoAdapter`)

### ตัวอย่าง production

```env
NODE_ENV=production
PORT=3031
MONGO_URI=mongodb+srv://...
JWT_SECRET=<random-long-secret>
TRUST_PROXY=true
CORS_ORIGINS=https://user.yourdomain.com,https://admin.yourdomain.com
```

---

## 2) Admin (`admin/.env.local`)

คัดลอกจาก `admin/.env.example`

```env
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

- ค่านี้ต้องเป็น **public URL ของ API** ที่เบราว์เซอร์เรียกได้
- ต้องอยู่ในรายการ **`CORS_ORIGINS`** ฝั่ง backend (ตาม origin ของหน้า admin — เช่น `https://admin.yourdomain.com`)

โค้ดอ่านผ่าน `shared/client/api-base-url.ts` (ลำดับ: `NEXT_PUBLIC_API_BASE_URL` → `NEXT_PUBLIC_BACKEND_URL` → `NEXT_PUBLIC_API_URL`)

---

## 3) User (`user/.env.local`)

เหมือน admin แต่ชี้ API เดียวกัน:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

ต้องมี **`https://user.yourdomain.com`** (หรือ origin จริงของ user app) ใน `CORS_ORIGINS`

---

## 4) Nginx (เชื่อมโยง)

- **API:** `proxy_pass` ไป `http://127.0.0.1:3031` — ส่ง header `X-Forwarded-Proto` / `Host`
- เปิด **WebSocket** สำหรับ path ที่ Socket.IO ใช้ (มักรากเดียวกับ HTTP)
- ใช้ **HTTPS** เพื่อให้ cookie `Secure` ทำงาน (`NODE_ENV=production`)

ตัวอย่างหัวข้อที่ต้องมีสำหรับ Socket.IO:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

---

## 5) Checklist ก่อนขึ้น production

- [ ] `CORS_ORIGINS` ครบทุก origin ของ admin + user (ไม่มี trailing slash ใน env — OK)
- [ ] `NEXT_PUBLIC_API_BASE_URL` ชี้ URL จริงของ API
- [ ] `TRUST_PROXY=true` เมื่อมี Nginx
- [ ] `JWT_SECRET` / `ADMIN_PASSWORD` ไม่ใช่ค่า dev
- [ ] ทดสอบ login → cookie + `GET /auth/me` และ Socket.IO ฝั่ง user
- [ ] อ่าน `docs/SCREENSHOT-SETUP.md` สำหรับเครื่องที่รัน ADB

---

## 6) Build บนเซิร์ฟเวอร์

```bash
# Backend
cd backend && npm ci && npm run build && npm run start:prod

# Admin / User
cd admin && npm ci && npm run build && npm run start
cd user && npm ci && npm run build && npm run start
```

(หรือใช้ PM2 / Docker ตามที่ทีมกำหนด)

---

*อัปเดตตามโค้ดปัจจุบัน — ถ้าเพิ่ม env ใหม่ในโค้ด ให้อัปเดต `backend/.env.example` และตารางในไฟล์นี้*
