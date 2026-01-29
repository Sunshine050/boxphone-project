# 🔧 Environment Variables Setup

## 📋 Required Environment Variables

### Backend (.env)
```env
PORT=3031
MONGO_URI=mongodb://localhost:27017/boxphon
JWT_SECRET=your-secret-key
JWT_EXPIRATION=1d
SESSION_MAX_MOVE_COUNT=2
BCRYPT_SALT_ROUNDS=10
```

### Admin Panel (.env.local)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3031
# หรือ
NEXT_PUBLIC_BACKEND_URL=http://localhost:3031
```

### User Panel (.env.local)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3031
# หรือ
NEXT_PUBLIC_BACKEND_URL=http://localhost:3031
```

---

## ✅ No Hardcode Policy

- ✅ All API URLs use environment variables
- ✅ No hardcoded ports or hosts
- ✅ Configuration centralized in .env files
- ✅ Easy to change for different environments

---

## 🔍 How It Works

### Admin Panel
1. Reads `NEXT_PUBLIC_API_BASE_URL` or `NEXT_PUBLIC_BACKEND_URL` from `.env.local`
2. Uses in `admin/services/api.ts`
3. All services use this base URL

### User Panel
1. Reads `NEXT_PUBLIC_API_BASE_URL` or `NEXT_PUBLIC_BACKEND_URL` from `.env.local`
2. Uses in `user/services/api.ts`
3. Socket client uses `NEXT_PUBLIC_BACKEND_URL` for WebSocket connection

---

## 🚀 Quick Setup

1. **Backend:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your values
   ```

2. **Admin Panel:**
   ```bash
   cd admin
   echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:3031" > .env.local
   ```

3. **User Panel:**
   ```bash
   cd user
   echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:3031" > .env.local
   ```

---

## ⚠️ Important Notes

- `NEXT_PUBLIC_*` variables are exposed to the browser
- Never put secrets in `NEXT_PUBLIC_*` variables
- Restart dev server after changing .env files
- Use different URLs for production/staging
