#!/bin/bash

# 시놀로지 NAS용 서비스 중지 스크립트
# 사용법: ./stop-service.sh

PROJECT_DIR="/volume1/web/jaryo"
PID_FILE="/volume1/web/jaryo/app.pid"

echo "=== Jaryo File Manager 서비스 중지 ==="

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    echo "프로세스 ID: $PID"
    
    if kill -0 "$PID" 2>/dev/null; then
        echo "서비스 중지 중..."
        kill "$PID"
        sleep 2
        
        # 강제 종료 확인
        if kill -0 "$PID" 2>/dev/null; then
            echo "강제 종료 중..."
            kill -9 "$PID"
        fi
        
        echo "서비스가 중지되었습니다."
    else
        echo "프로세스가 이미 종료되었습니다."
    fi
    
    rm -f "$PID_FILE"
else
    echo "PID 파일을 찾을 수 없습니다. 수동으로 프로세스를 확인하세요."
    echo "실행 중인 Node.js 프로세스:"
    ps aux | grep "node server.js" | grep -v grep
fi
