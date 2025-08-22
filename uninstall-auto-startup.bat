@echo off
REM Windows 작업 스케줄러에서 자동 시작 설정 제거 스크립트
REM 관리자 권한으로 실행 필요

echo === Jaryo File Manager 자동 시작 설정 제거 ===
echo.

REM 관리자 권한 확인
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo 오류: 이 스크립트는 관리자 권한으로 실행해야 합니다.
    echo 마우스 우클릭 후 "관리자 권한으로 실행"을 선택해주세요.
    pause
    exit /b 1
)

set TASK_NAME=JaryoFileManagerAutoStart

echo 작업 이름: %TASK_NAME%
echo.

REM 작업 존재 여부 확인
schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ 자동 시작 작업을 찾을 수 없습니다.
    echo 이미 제거되었거나 설치되지 않았습니다.
    goto :end
)

REM 현재 실행 중인 서비스 중지
echo 현재 실행 중인 서비스를 중지합니다...
call "%~dp0stop-jaryo-service.bat"

echo.
echo 자동 시작 작업을 제거합니다...

REM 작업 삭제
schtasks /delete /tn "%TASK_NAME%" /f

if %errorlevel% equ 0 (
    echo.
    echo ✅ 자동 시작 작업이 성공적으로 제거되었습니다!
    echo.
    echo 이제 컴퓨터를 재시작해도 Jaryo File Manager가 자동으로 시작되지 않습니다.
    echo 수동으로 서비스를 시작하려면 start-jaryo-service.bat를 실행하세요.
) else (
    echo.
    echo ❌ 자동 시작 작업 제거에 실패했습니다.
    echo 관리자 권한으로 실행했는지 확인해주세요.
)

:end
echo.
pause