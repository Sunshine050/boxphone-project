// PM2 Ecosystem Config — BoxPhone Production
// รัน: pm2 start ecosystem.config.js --env production
// ดูสถานะ: pm2 list
// ดู log: pm2 logs <app-name>

module.exports = {
  apps: [
    // ─── Backend (NestJS) ───────────────────────────────────────────────────
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
        ALLOW_ADMIN_SEED_IN_PRODUCTION: 'true',
        COOKIE_DOMAIN: '.myrealphone.cloud',
        ADB_PATH: 'C:\\Program Files (x86)\\xiaowei_android\\tools\\adb.exe',
      },
    },

    // ─── Admin (Next.js) ────────────────────────────────────────────────────
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
      },
    },

    // ─── User App (Next.js) ─────────────────────────────────────────────────
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
      },
    },
  ],
};
