@echo off
setlocal EnableDelayedExpansion

:: ─── BoxPhone Deploy Script (Windows) ────────────────────────────────────────
:: รัน script นี้ใน Command Prompt หรือ PowerShell ปกติ (ไม่ต้องการ Admin)
:: PM2 จะรันในฐานะ user ปัจจุบันเสมอ
:: ─────────────────────────────────────────────────────────────────────────────

set ROOT=%~dp0..

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

:: ─── ล้าง PM2 daemon เก่า (สำคัญ: ป้องกัน EPERM จาก session ก่อนหน้า) ──
echo [0/7] ล้าง PM2 daemon เก่า...
pm2 kill >nul 2>&1
timeout /t 2 /nobreak >nul
echo       ✓ PM2 daemon ล้างแล้ว

:: ─── Build: Backend ───────────────────────────────────────────────────────
echo.
echo [1/7] Building Backend (NestJS)...
cd /d "%ROOT%\backend"
if %ERRORLEVEL% neq 0 ( echo [ERROR] ไม่พบ folder backend & exit /b 1 )

call npm install
if %ERRORLEVEL% neq 0 ( echo [ERROR] npm install backend ล้มเหลว & exit /b 1 )

call npm run build
if %ERRORLEVEL% neq 0 ( echo [ERROR] npm run build backend ล้มเหลว & exit /b 1 )
echo       ✓ Backend build สำเร็จ

:: ─── Build: Admin ─────────────────────────────────────────────────────────
echo.
echo [2/7] Building Admin Panel (Next.js)...
cd /d "%ROOT%\admin"
if %ERRORLEVEL% neq 0 ( echo [ERROR] ไม่พบ folder admin & exit /b 1 )

call npm install
if %ERRORLEVEL% neq 0 ( echo [ERROR] npm install admin ล้มเหลว & exit /b 1 )

call npm run build
if %ERRORLEVEL% neq 0 ( echo [ERROR] npm run build admin ล้มเหลว & exit /b 1 )
echo       ✓ Admin build สำเร็จ

:: ─── Build: User App ──────────────────────────────────────────────────────
echo.
echo [3/7] Building User App (Next.js)...
cd /d "%ROOT%\user"
if %ERRORLEVEL% neq 0 ( echo [ERROR] ไม่พบ folder user & exit /b 1 )

call npm install
if %ERRORLEVEL% neq 0 ( echo [ERROR] npm install user ล้มเหลว & exit /b 1 )

call npm run build
if %ERRORLEVEL% neq 0 ( echo [ERROR] npm run build user ล้มเหลว & exit /b 1 )
echo       ✓ User app build สำเร็จ

:: ─── สร้าง logs directory ─────────────────────────────────────────────────
echo.
echo [4/7] เตรียม logs directory...
cd /d "%ROOT%"
if not exist "logs" mkdir logs
echo       ✓ logs/ พร้อม

:: ─── Start PM2 ────────────────────────────────────────────────────────────
echo.
echo [5/7] เริ่ม services ด้วย PM2...
cd /d "%ROOT%"
call pm2 start ecosystem.config.js --env production
if %ERRORLEVEL% neq 0 ( echo [ERROR] PM2 start ล้มเหลว & exit /b 1 )
echo       ✓ PM2 start สำเร็จ

:: ─── PM2 Save ─────────────────────────────────────────────────────────────
echo.
echo [6/7] บันทึก PM2 process list...
call pm2 save --force
echo       ✓ PM2 save สำเร็จ

:: ─── ตั้งค่า Auto-Start (ถ้ายังไม่ได้ทำ) ────────────────────────────────
echo.
echo [7/7] ตรวจสอบ Auto-Start...
schtasks /query /tn "BoxPhone-PM2-AutoStart" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo       ยังไม่มี Auto-Start — รัน setup-autostart.bat เพื่อตั้งค่า
) else (
    echo       ✓ Auto-Start ติดตั้งแล้ว
)

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

pause
endlocal
