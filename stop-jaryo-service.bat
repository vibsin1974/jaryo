@echo off
REM Windows용 Jaryo File Manager 서비스 중지 스크립트
REM 사용법: stop-jaryo-service.bat

echo === Jaryo File Manager 서비스 중지 ===
echo 중지 시간: %date% %time%

set PROJECT_DIR=C:\Users\COMTREE\claude_code\jaryo
set PID_FILE=%PROJECT_DIR%\app.pid

REM PID 파일이 있는 경우
if exist "%PID_FILE%" (
    for /f %%i in (%PID_FILE%) do (
        echo 프로세스 ID: %%i
        echo 서비스 중지 중...
        
        REM 프로세스 종료
        taskkill /pid %%i /f >nul 2>&1
        if %errorlevel% equ 0 (
            echo 서비스가 중지되었습니다.
        ) else (
            echo 프로세스가 이미 종료되었거나 종료할 수 없습니다.
        )
    )
    
    REM PID 파일 삭제
    del "%PID_FILE%"
) else (
    echo PID 파일을 찾을 수 없습니다. Node.js 프로세스를 직접 확인합니다.
)

REM 실행 중인 모든 관련 Node.js 프로세스 확인 및 종료
echo.
echo 실행 중인 Jaryo 관련 Node.js 프로세스를 확인합니다...

REM server.js를 실행하는 모든 node.exe 프로세스 종료
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fo table /nh 2^>nul ^| findstr /i "node.exe"') do (
    wmic process where "processid=%%i and commandline like '%%server.js%%'" get commandline /value 2>nul | findstr "server.js" >nul
    if not errorlevel 1 (
        echo Jaryo 서비스 프로세스 발견 - PID: %%i
        taskkill /pid %%i /f >nul 2>&1
        if not errorlevel 1 (
            echo 프로세스 %%i가 종료되었습니다.
        )
    )
)

REM cmd 프로세스 중에서 node server.js를 실행하는 것도 확인
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq cmd.exe" /fo table /nh 2^>nul ^| findstr /i "cmd.exe"') do (
    wmic process where "processid=%%i and commandline like '%%server.js%%'" get commandline /value 2>nul | findstr "server.js" >nul
    if not errorlevel 1 (
        echo Jaryo 관련 CMD 프로세스 발견 - PID: %%i
        taskkill /pid %%i /f >nul 2>&1
        if not errorlevel 1 (
            echo CMD 프로세스 %%i가 종료되었습니다.
        )
    )
)

echo.
echo === 현재 실행 중인 Node.js 프로세스 ===
tasklist /fi "imagename eq node.exe" 2>nul | findstr "node.exe" || echo Node.js 프로세스가 실행되지 않음

echo.
echo 서비스 중지가 완료되었습니다.