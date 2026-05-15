@echo off
setlocal EnableDelayedExpansion

:: ─── BoxPhone Auto-Start Setup ────────────────────────────────────────────────
:: รันครั้งเดียวเพื่อตั้งค่าให้ PM2 รัน BoxPhone อัตโนมัติทุกครั้งที่เปิดเครื่อง
:: ใช้ Windows Task Scheduler — ไม่ต้องล็อกอินก็ทำงานได้
:: ─────────────────────────────────────────────────────────────────────────────

:: ─── Auto-elevate to Administrator ──────────────────────────────────────────
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo กำลังขอสิทธิ์ Administrator ^(UAC จะปรากฏ^)...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs -Wait"
    exit /b 0
)

set ROOT=%~dp0..

echo.
echo ╔══════════════════════════════════════════════╗
echo ║     BoxPhone Auto-Start Setup                ║
echo ╚══════════════════════════════════════════════╝
echo.

:: ─── ตรวจสอบ PM2 ──────────────────────────────────────────────────────────
where pm2 >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] ไม่พบ PM2 — กรุณารัน deploy-windows.bat ก่อน
    exit /b 1
)

:: ─── ตรวจสอบว่า PM2 มี process list หรือยัง ──────────────────────────────
echo [1/3] ตรวจสอบ PM2 dump file...
if not exist "%USERPROFILE%\.pm2\dump.pm2" (
    echo [WARN] ยังไม่มี PM2 dump — กรุณารัน deploy-windows.bat ก่อน
    echo        เพื่อให้ PM2 รู้จัก services ที่ต้องรัน
    echo.
    set /p CONT=ต้องการดำเนินการต่อหรือไม่? (y/n):
    if /i "!CONT!" neq "y" exit /b 0
)
echo       ✓ ตรวจสอบแล้ว

:: ─── สร้าง VBScript สำหรับรัน PM2 แบบ hidden (ไม่มีหน้าต่าง cmd) ────────
echo [2/3] สร้าง startup launcher...
set LAUNCHER=%ROOT%\scripts\pm2-resurrect.vbs

echo Set oShell = CreateObject("WScript.Shell") > "%LAUNCHER%"
echo oShell.Run "cmd /c pm2 resurrect", 0, False >> "%LAUNCHER%"

echo       ✓ สร้าง %LAUNCHER% แล้ว

:: ─── ลงทะเบียน Task Scheduler ────────────────────────────────────────────
echo [3/3] ลงทะเบียน Windows Task Scheduler...

:: ลบ task เก่าถ้ามี
schtasks /delete /tn "BoxPhone-PM2-AutoStart" /f >nul 2>&1

:: สร้าง task ใหม่: รันทุกครั้งที่ user ล็อกอิน, delay 30 วินาที (รอ network)
schtasks /create ^
  /tn "BoxPhone-PM2-AutoStart" ^
  /tr "wscript.exe \"%LAUNCHER%\"" ^
  /sc ONLOGON ^
  /delay 0000:30 ^
  /rl HIGHEST ^
  /f

if %ERRORLEVEL% neq 0 (
    echo [ERROR] ลงทะเบียน Task Scheduler ล้มเหลว
    exit /b 1
)

echo       ✓ Task Scheduler ลงทะเบียนสำเร็จ

:: ─── สรุป ─────────────────────────────────────────────────────────────────
echo.
echo ╔══════════════════════════════════════════════╗
echo ║       Auto-Start ติดตั้งเสร็จสมบูรณ์!       ║
echo ╚══════════════════════════════════════════════╝
echo.
echo สิ่งที่ติดตั้ง:
echo   ✓ Task: "BoxPhone-PM2-AutoStart" (รัน 30 วิ หลัง Login)
echo   ✓ Launcher: scripts\pm2-resurrect.vbs
echo.
echo วิธีทำงาน:
echo   1. เปิดเครื่อง -^> Login -^> รอ 30 วินาที
echo   2. PM2 จะ resurrect services อัตโนมัติ
echo   3. BoxPhone พร้อมใช้งาน
echo.
echo ดูสถานะ Task:
echo   schtasks /query /tn "BoxPhone-PM2-AutoStart"
echo.
echo ลบ Auto-Start:
echo   schtasks /delete /tn "BoxPhone-PM2-AutoStart" /f
echo.

pause
endlocal
