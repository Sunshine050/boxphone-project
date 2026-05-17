// PM2 Ecosystem Config — BoxPhone
// Production: pm2 start ecosystem.config.js --env production
// Staging (scrcpy):  pm2 start ecosystem.config.js --only boxphone-backend-staging,boxphone-admin-staging,boxphone-user-staging
// ดูสถานะ: pm2 list
// ดู log: pm2 logs <app-name>

const ADB_PATH_WIN = 'C:\\Program Files (x86)\\xiaowei_android\\tools\\adb.exe';

module.exports = {
  apps: [
    // ─── Backend (NestJS) — Production ──────────────────────────────────────
    {
      name: 'boxphone-backend',
      script: 'dist/main.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      restart_delay: 3000,
      max_restarts: 10,
      watch: false,
      out_file: './logs/backend-out.log',
      error_file: './logs/backend-err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3031,
        ALLOW_ADMIN_SEED_IN_PRODUCTION: 'false',
        COOKIE_DOMAIN: '.myrealphone.cloud',
        ADB_PATH: ADB_PATH_WIN,
        STREAMING_MODE: 'scrcpy',
        SCRCPY_SERVER_VERSION: '2.4',
        SCRCPY_VIDEO_BITRATE: '3000000',
        SCRCPY_MAX_FPS: '30',
        SCRCPY_MAX_SIZE: '1280',
        SCRCPY_PORT_POOL_START: '27183',
        SCRCPY_PORT_POOL_SIZE: '100',
        SCRCPY_IDLE_TIMEOUT_MS: '30000',
        MAX_CONCURRENT_STREAMS: '20',
        // c2.android.avc.encoder = software H.264 fallback — avoids
        // OMX.qcom.video.encoder.avc stack-corruption crash on Android 10 + Samsung
        SCRCPY_VIDEO_ENCODER: 'c2.android.avc.encoder',
      },
    },

    // ─── Admin (Next.js) — Production ───────────────────────────────────────
    {
      name: 'boxphone-admin',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3000',
      cwd: './admin',
      instances: 1,
      exec_mode: 'fork',
      restart_delay: 3000,
      max_restarts: 10,
      watch: false,
      out_file: './logs/admin-out.log',
      error_file: './logs/admin-err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        BACKEND_PROXY_URL: 'http://127.0.0.1:3031',
      },
    },

    // ─── User App (Next.js) — Production ────────────────────────────────────
    {
      name: 'boxphone-user',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3001',
      cwd: './user',
      instances: 1,
      exec_mode: 'fork',
      restart_delay: 3000,
      max_restarts: 10,
      watch: false,
      out_file: './logs/user-out.log',
      error_file: './logs/user-err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        BACKEND_PROXY_URL: 'http://127.0.0.1:3031',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // STAGING (scrcpy H.264 streaming) — รันคู่กับ production บน server PC เดียวกัน
    // - port 3032 / 3010 / 3011 (ไม่ชน production 3031 / 3000 / 3001)
    // - STREAMING_MODE=scrcpy — เปิด H.264 stream pipeline
    // - ใช้ DB เดียวกับ production (schema เหมือนกัน, ไม่กระทบ data)
    // - rollback: pm2 stop boxphone-backend-staging — กลับมาใช้ production ทันที
    // ═══════════════════════════════════════════════════════════════════════

    // ─── Backend Staging (NestJS + scrcpy) ──────────────────────────────────
    {
      name: 'boxphone-backend-staging',
      script: 'dist/main.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      restart_delay: 3000,
      max_restarts: 10,
      watch: false,
      out_file: './logs/backend-staging-out.log',
      error_file: './logs/backend-staging-err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'production',
        PORT: 3032,
        ALLOW_ADMIN_SEED_IN_PRODUCTION: 'false',
        COOKIE_DOMAIN: '.myrealphone.cloud',
        ADB_PATH: ADB_PATH_WIN,
        // ─── SCRCPY streaming ─────────────────────────────────────────────
        STREAMING_MODE: 'scrcpy',
        SCRCPY_VIDEO_BITRATE: '3000000',
        SCRCPY_MAX_FPS: '30',
        SCRCPY_MAX_SIZE: '1280',
        SCRCPY_PORT_POOL_START: '27183',
        SCRCPY_PORT_POOL_SIZE: '100',
        SCRCPY_IDLE_TIMEOUT_MS: '30000',
        MAX_CONCURRENT_STREAMS: '20',
        // staging อย่าให้ seed admin ทับ production
      },
    },

    // ─── Admin Staging (Next.js) ────────────────────────────────────────────
    {
      name: 'boxphone-admin-staging',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3010',
      cwd: './admin',
      instances: 1,
      exec_mode: 'fork',
      restart_delay: 3000,
      max_restarts: 10,
      watch: false,
      out_file: './logs/admin-staging-out.log',
      error_file: './logs/admin-staging-err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
        BACKEND_PROXY_URL: 'http://127.0.0.1:3032',
      },
    },

    // ─── User App Staging (Next.js) ─────────────────────────────────────────
    {
      name: 'boxphone-user-staging',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3011',
      cwd: './user',
      instances: 1,
      exec_mode: 'fork',
      restart_delay: 3000,
      max_restarts: 10,
      watch: false,
      out_file: './logs/user-staging-out.log',
      error_file: './logs/user-staging-err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'production',
        PORT: 3011,
        BACKEND_PROXY_URL: 'http://127.0.0.1:3032',
      },
    },
  ],
};
