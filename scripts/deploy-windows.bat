@echo off
setlocal EnableDelayedExpansion

:: ─── BoxPhone Deploy Script (Windows) ────────────────────────────────────────
:: รัน script นี้ใน Command Prompt หรือ PowerShell ในฐานะ Administrator
:: เงื่อนไข: Node.js, PM2, และ Git ต้องติดตั้งไว้แล้ว
::
:: วิธีติดตั้ง PM2 ครั้งแรก:
::   npm install -g pm2
::   npm install -g pm2-windows-startup
::   pm2-startup install
:: ─────────────────────────────────────────────────────────────────────────────

set ROOT=%~dp0..
set ERRORS=0

echo.
echo ╔══════════════════════════════════════════════╗
echo ║       BoxPhone Production Deploy             ║
echo ╚══════════════════════════════════════════════╝
echo.

:: ─── ตรวจสอบ PM2 ──────────────────────────────────────────────────────────
where pm2 >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] ไม่พบ PM2 — กรุณาติดตั้งก่อน: npm install -g pm2
    exit /b 1
)

:: ─── หยุด PM2 apps เก่า (ถ้ามี) ──────────────────────────────────────────
echo [1/7] หยุด PM2 apps เก่า...
pm2 stop all >nul 2>&1
echo       ✓ Done

:: ─── Build: Backend ───────────────────────────────────────────────────────
echo.
echo [2/7] Building Backend (NestJS)...
cd /d "%ROOT%\backend"
if %ERRORLEVEL% neq 0 ( echo [ERROR] ไม่พบ folder backend & exit /b 1 )

call npm install
if %ERRORLEVEL% neq 0 ( echo [ERROR] npm install backend ล้มเหลว & exit /b 1 )

call npm run build
if %ERRORLEVEL% neq 0 ( echo [ERROR] npm run build backend ล้มเหลว & exit /b 1 )
echo       ✓ Backend build สำเร็จ

:: ─── Build: Admin ─────────────────────────────────────────────────────────
echo.
echo [3/7] Building Admin Panel (Next.js)...
cd /d "%ROOT%\admin"
if %ERRORLEVEL% neq 0 ( echo [ERROR] ไม่พบ folder admin & exit /b 1 )

call npm install
if %ERRORLEVEL% neq 0 ( echo [ERROR] npm install admin ล้มเหลว & exit /b 1 )

call npm run build
if %ERRORLEVEL% neq 0 ( echo [ERROR] npm run build admin ล้มเหลว & exit /b 1 )
echo       ✓ Admin build สำเร็จ

:: ─── Build: User App ──────────────────────────────────────────────────────
echo.
echo [4/7] Building User App (Next.js)...
cd /d "%ROOT%\user"
if %ERRORLEVEL% neq 0 ( echo [ERROR] ไม่พบ folder user & exit /b 1 )

call npm install
if %ERRORLEVEL% neq 0 ( echo [ERROR] npm install user ล้มเหลว & exit /b 1 )

call npm run build
if %ERRORLEVEL% neq 0 ( echo [ERROR] npm run build user ล้มเหลว & exit /b 1 )
echo       ✓ User app build สำเร็จ

:: ─── สร้าง logs directory ─────────────────────────────────────────────────
echo.
echo [5/7] เตรียม logs directory...
cd /d "%ROOT%"
if not exist "logs" mkdir logs
echo       ✓ logs/ พร้อม

:: ─── Start PM2 ────────────────────────────────────────────────────────────
echo.
echo [6/7] เริ่ม services ด้วย PM2...
cd /d "%ROOT%"
call pm2 start ecosystem.config.js --env production
if %ERRORLEVEL% neq 0 ( echo [ERROR] PM2 start ล้มเหลว & exit /b 1 )
echo       ✓ PM2 start สำเร็จ

:: ─── PM2 Save ─────────────────────────────────────────────────────────────
echo.
echo [7/7] บันทึก PM2 process list...
call pm2 save
if %ERRORLEVEL% neq 0 ( echo [WARN] pm2 save ล้มเหลว — ข้าม )

:: ─── สรุป ─────────────────────────────────────────────────────────────────
echo.
echo ╔══════════════════════════════════════════════╗
echo ║           Deploy เสร็จสมบูรณ์!              ║
echo ╚══════════════════════════════════════════════╝
echo.
echo Services ที่กำลังรัน:
pm2 list

echo.
echo ดู log ได้ด้วย:
echo   pm2 logs boxphone-backend
echo   pm2 logs boxphone-admin
echo   pm2 logs boxphone-user
echo.

endlocal
