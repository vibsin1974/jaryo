@echo off
REM 작업 스케줄러에 XML 파일로 작업 등록
echo === Jaryo File Manager 자동 시작 설정 ===
echo.

REM 관리자 권한 확인
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo This script requires administrator privileges.
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

set TASK_NAME=JaryoFileManagerAutoStart
set XML_FILE=%~dp0JaryoAutoStart.xml

echo Task Name: %TASK_NAME%
echo XML File: %XML_FILE%
echo.

REM 기존 작업 삭제 (있는 경우)
schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    echo Removing existing task...
    schtasks /delete /tn "%TASK_NAME%" /f
)

REM XML 파일로 작업 생성
echo Creating new auto-start task...
schtasks /create /tn "%TASK_NAME%" /xml "%XML_FILE%"

if %errorlevel% equ 0 (
    echo.
    echo SUCCESS: Auto-start task created successfully!
    echo.
    echo Task Name: %TASK_NAME%
    echo Service URL: http://99.1.110.50:3005
    echo.
    echo The service will start automatically on system boot.
) else (
    echo.
    echo ERROR: Failed to create auto-start task.
    echo Please run this script as administrator.
)

echo.
echo Management commands:
echo Check task: schtasks /query /tn "%TASK_NAME%"
echo Run task: schtasks /run /tn "%TASK_NAME%"
echo Delete task: schtasks /delete /tn "%TASK_NAME%" /f
echo.
pause