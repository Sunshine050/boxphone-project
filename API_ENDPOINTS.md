# 📡 API Endpoints Documentation

## 🔧 Configuration

### Environment Variables

**Admin Panel (.env.local):**
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3031
# หรือ
NEXT_PUBLIC_BACKEND_URL=http://localhost:3031
```

**User Panel (.env.local):**
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3031
# หรือ
NEXT_PUBLIC_BACKEND_URL=http://localhost:3031
```

---

## 🔐 Authentication

### POST /auth/login
- **Description:** Login user
- **Auth:** Not required
- **Body:**
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Response:**
  ```json
  {
    "access_token": "string",
    "user": { ... }
  }
  ```

### POST /auth/register
- **Description:** Register new user
- **Auth:** Not required
- **Body:**
  ```json
  {
    "username": "string",
    "password": "string",
    "role": "USER"
  }
  ```

---

## 👥 Users

### GET /users
- **Description:** Get all users
- **Auth:** Required (Admin only)

### GET /users/me
- **Description:** Get current user profile
- **Auth:** Required

### GET /users/:id
- **Description:** Get user by ID
- **Auth:** Required (Admin only)

### POST /users
- **Description:** Create user (Admin only)
- **Auth:** Required (Admin only)
- **Body:**
  ```json
  {
    "name": "string",
    "username": "string",
    "password": "string"
  }
  ```

### PATCH /users/:id
- **Description:** Update user
- **Auth:** Required (Admin only)

### DELETE /users/:id
- **Description:** Delete user
- **Auth:** Required (Admin only)

### POST /users/:id/add-time
- **Description:** Add time to user
- **Auth:** Required (Admin only)
- **Body:**
  ```json
  {
    "duration": "1h" | "1d" | "1w" | "1m",
    "start_time": "string" (optional)
  }
  ```

### POST /users/:id/assign-devices
- **Description:** Assign devices to user
- **Auth:** Required (Admin only)
- **Body:**
  ```json
  {
    "items": [
      {
        "device_id": "string",
        "assign_seconds": 3600 (optional)
      }
    ]
  }
  ```

### POST /users/bulk-add-time
- **Description:** Add time to all INUSE users
- **Auth:** Required (Admin only)
- **Body:**
  ```json
  {
    "add_seconds": 3600
  }
  ```

### POST /users/:id/connect-device
- **Description:** Connect user to device
- **Auth:** Required (Admin only)
- **Body:**
  ```json
  {
    "device_id": "string"
  }
  ```

### POST /users/:id/disconnect-device
- **Description:** Disconnect user from device
- **Auth:** Required (Admin only)

---

## 📱 Devices

### GET /devices
- **Description:** Get all devices
- **Auth:** Required

### GET /devices/:id
- **Description:** Get device by ID
- **Auth:** Required

### POST /devices
- **Description:** Create device
- **Auth:** Required (Admin only)
- **Body:**
  ```json
  {
    "name": "string",
    "serial_number": "string",
    "model": "string",
    "status": "AVAILABLE"
  }
  ```

### PATCH /devices/:id
- **Description:** Update device
- **Auth:** Required (Admin only)

### DELETE /devices/:id
- **Description:** Delete device
- **Auth:** Required (Admin only)

---

## 📝 Sessions

### POST /sessions
- **Description:** Create session
- **Auth:** Required (Admin only)
- **Body:**
  ```json
  {
    "user_id": "string",
    "device_id": "string",
    "package": "BASIC",
    "total_seconds": 3600
  }
  ```

### GET /sessions
- **Description:** Get all sessions
- **Auth:** Required (Admin only)

### GET /sessions/:id
- **Description:** Get session by ID
- **Auth:** Required (Admin only)

### GET /sessions/user/:userId
- **Description:** Get active session by user
- **Auth:** Required (Admin only)

### GET /sessions/device/:deviceId
- **Description:** Get active session by device
- **Auth:** Required (Admin only)

### GET /sessions/:id/remaining
- **Description:** Get remaining time
- **Auth:** Required (Admin only)

### POST /sessions/:id/pause
- **Description:** Pause session
- **Auth:** Required (Admin only)
- **Body:**
  ```json
  {
    "reason": "string" (optional)
  }
  ```

### POST /sessions/:id/resume
- **Description:** Resume session
- **Auth:** Required (Admin only)

### POST /sessions/:id/move
- **Description:** Move session to another device
- **Auth:** Required (Admin only)
- **Body:**
  ```json
  {
    "to_device_id": "string",
    "reason": "string" (optional)
  }
  ```

### GET /sessions/:id/move-logs
- **Description:** Get move logs
- **Auth:** Required (Admin only)

### POST /sessions/:id/cancel
- **Description:** Cancel session
- **Auth:** Required (Admin only)

---

## 📦 Service Files

### Admin Panel
- `admin/services/api.ts` - Base API client
- `admin/services/auth.service.ts` - Authentication
- `admin/services/users.service.ts` - Users management
- `admin/services/devices.service.ts` - Devices management
- `admin/services/sessions.service.ts` - Sessions management

### User Panel
- `user/services/api.ts` - Base API client
- `user/services/auth.service.ts` - Authentication
- `user/services/users.service.ts` - User profile
- `user/services/devices.service.ts` - Devices listing
- `user/services/sessions.service.ts` - Sessions (read-only)

---

## ✅ No Hardcode Policy

- ✅ All API endpoints use environment variables
- ✅ No hardcoded URLs or ports
- ✅ All services use centralized API client
- ✅ Error handling in API client
- ✅ Token management in API client

---

## 🔍 Usage Examples

### Admin Panel
```typescript
import { UsersService } from "@/services/users.service";
import { DevicesService } from "@/services/devices.service";
import { SessionsService } from "@/services/sessions.service";

// Get all users
const users = await UsersService.getAll();

// Create user
await UsersService.createByAdmin({
  name: "John Doe",
  username: "johndoe",
  password: "password123"
});

// Connect user to device
await UsersService.connectDevice(userId, deviceId);

// Create session
await SessionsService.create({
  user_id: userId,
  device_id: deviceId,
  package: "BASIC",
  total_seconds: 3600
});
```

### User Panel
```typescript
import { AuthService } from "@/services/auth.service";
import { UsersService } from "@/services/users.service";
import { SessionsService } from "@/services/sessions.service";

// Login
const result = await AuthService.login("username", "password");
localStorage.setItem("access_token", result.access_token);

// Get profile
const profile = await UsersService.getMe();

// Get active session
const session = await SessionsService.getByUser(userId);
```
