@echo off
REM Windows 작업 스케줄러를 사용한 자동 시작 설정 스크립트
REM 관리자 권한으로 실행 필요

echo === Jaryo File Manager 자동 시작 설정 ===
echo.

REM 관리자 권한 확인
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo 오류: 이 스크립트는 관리자 권한으로 실행해야 합니다.
    echo 마우스 우클릭 후 "관리자 권한으로 실행"을 선택해주세요.
    pause
    exit /b 1
)

set PROJECT_DIR=C:\Users\COMTREE\claude_code\jaryo
set TASK_NAME=JaryoFileManagerAutoStart

echo 프로젝트 디렉토리: %PROJECT_DIR%
echo 작업 이름: %TASK_NAME%
echo.

REM 기존 작업이 있으면 삭제
schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    echo 기존 자동 시작 작업을 제거합니다...
    schtasks /delete /tn "%TASK_NAME%" /f
)

REM 새로운 자동 시작 작업 생성
echo 새로운 자동 시작 작업을 생성합니다...

REM 시스템 시작 시 실행되는 작업 생성
schtasks /create /tn "%TASK_NAME%" ^
    /tr "\"%PROJECT_DIR%\start-jaryo-service.bat\"" ^
    /sc onstart ^
    /ru "SYSTEM" ^
    /rl highest ^
    /f

if %errorlevel% equ 0 (
    echo.
    echo ✅ 자동 시작 작업이 성공적으로 생성되었습니다!
    echo.
    echo === 설정 정보 ===
    echo 작업 이름: %TASK_NAME%
    echo 실행 파일: %PROJECT_DIR%\start-jaryo-service.bat
    echo 트리거: 시스템 시작 시
    echo 실행 계정: SYSTEM
    echo.
    echo === 관리 명령어 ===
    echo 작업 확인: schtasks /query /tn "%TASK_NAME%"
    echo 수동 실행: schtasks /run /tn "%TASK_NAME%"
    echo 작업 삭제: schtasks /delete /tn "%TASK_NAME%" /f
    echo.
    echo 이제 컴퓨터를 재시작하면 Jaryo File Manager가 자동으로 시작됩니다.
    echo 서비스 URL: http://99.1.110.50:3005
) else (
    echo.
    echo ❌ 자동 시작 작업 생성에 실패했습니다.
    echo 관리자 권한으로 실행했는지 확인해주세요.
)

echo.
pause