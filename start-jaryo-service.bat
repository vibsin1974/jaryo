@echo off
REM Windows용 Jaryo File Manager 자동 시작 스크립트
REM 사용법: start-jaryo-service.bat

echo === Jaryo File Manager 서비스 시작 ===
echo 시작 시간: %date% %time%

REM 프로젝트 디렉토리 설정
set PROJECT_DIR=C:\Users\COMTREE\claude_code\jaryo
set LOG_FILE=%PROJECT_DIR%\logs\app.log
set PID_FILE=%PROJECT_DIR%\app.pid

echo 프로젝트 디렉토리: %PROJECT_DIR%
echo 로그 파일: %LOG_FILE%

REM 로그 디렉토리 생성
if not exist "%PROJECT_DIR%\logs" mkdir "%PROJECT_DIR%\logs"

REM 프로젝트 디렉토리로 이동
cd /d "%PROJECT_DIR%" || (
    echo 오류: 프로젝트 디렉토리를 찾을 수 없습니다: %PROJECT_DIR%
    pause
    exit /b 1
)

REM Node.js와 npm 경로 확인
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo 오류: Node.js가 설치되지 않았거나 PATH에 없습니다.
    pause
    exit /b 1
)

REM 의존성 설치 확인
if not exist "node_modules" (
    echo 의존성 설치 중...
    npm install
)

REM 기존 프로세스 종료 (PID 파일이 있으면)
if exist "%PID_FILE%" (
    echo 기존 프로세스 종료 중...
    call stop-jaryo-service.bat
    timeout /t 3 /nobreak >nul
)

REM 서비스 시작 (백그라운드에서 실행)
echo 서비스 시작 중...
start "" /min cmd /c "node server.js >> "%LOG_FILE%" 2>&1"

REM 프로세스 ID 저장을 위해 잠시 대기
timeout /t 2 /nobreak >nul

REM 실행 중인 프로세스 확인
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fo csv /nh ^| findstr server.js') do (
    echo %%i > "%PID_FILE%"
    echo 서비스가 시작되었습니다. PID: %%i
    goto :found
)

REM PID를 찾지 못한 경우 (다른 방법으로 확인)
wmic process where "name='node.exe' and commandline like '%%server.js%%'" get processid /value 2>nul | findstr "ProcessId" > temp_pid.txt
if exist temp_pid.txt (
    for /f "tokens=2 delims==" %%i in (temp_pid.txt) do (
        echo %%i > "%PID_FILE%"
        echo 서비스가 시작되었습니다. PID: %%i
        del temp_pid.txt
        goto :found
    )
    del temp_pid.txt
)

echo 프로세스 ID를 확인할 수 없습니다. 수동으로 확인해주세요.

:found
echo.
echo === 서비스 정보 ===
echo 관리자 페이지: http://99.1.110.50:3005/admin/index.html
echo 메인 페이지: http://99.1.110.50:3005/index.html
echo API: http://99.1.110.50:3005/api/files
echo 로그 확인: type "%LOG_FILE%"
echo 서비스 중지: stop-jaryo-service.bat
echo.
echo 서비스가 성공적으로 시작되었습니다.