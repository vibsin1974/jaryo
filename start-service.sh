#!/bin/bash

# 시놀로지 NAS용 서비스 시작 스크립트
# 사용법: ./start-service.sh

# 프로젝트 디렉토리 설정 (실제 경로에 맞게 수정)
PROJECT_DIR="/volume1/web/jaryo"
LOG_FILE="/volume1/web/jaryo/logs/app.log"
PID_FILE="/volume1/web/jaryo/app.pid"

# 로그 디렉토리 생성
mkdir -p "$(dirname $LOG_FILE)"

# Node.js 경로 확인 (시놀로지 기본 설치 경로)
NODE_PATH="/volume1/@appstore/Node.js_v18/usr/local/bin/node"
if [ ! -f "$NODE_PATH" ]; then
    NODE_PATH="node"
fi

# NPM 경로 확인
NPM_PATH="/volume1/@appstore/Node.js_v18/usr/local/bin/npm"
if [ ! -f "$NPM_PATH" ]; then
    NPM_PATH="npm"
fi

echo "=== Jaryo File Manager 서비스 시작 ==="
echo "프로젝트 디렉토리: $PROJECT_DIR"
echo "Node.js 경로: $NODE_PATH"
echo "로그 파일: $LOG_FILE"

# 프로젝트 디렉토리로 이동
cd "$PROJECT_DIR" || {
    echo "오류: 프로젝트 디렉토리를 찾을 수 없습니다: $PROJECT_DIR"
    exit 1
}

# 의존성 설치 확인
if [ ! -d "node_modules" ]; then
    echo "의존성 설치 중..."
    $NPM_PATH install
fi

# MariaDB 데이터베이스 초기화
echo "MariaDB 데이터베이스 초기화 중..."
if [ -f "scripts/init-mariadb.js" ]; then
    # NAS 환경 설정
    export NODE_ENV=production
    export DEPLOY_ENV=nas
    
    if $NPM_PATH run init-mariadb; then
        echo "✅ MariaDB 초기화 완료"
    else
        echo "⚠️ MariaDB 초기화 실패"
        echo "💡 수동으로 MariaDB를 설정해야 할 수 있습니다."
        echo "자세한 내용은 mariadb-setup.md를 참조하세요."
    fi
else
    echo "⚠️ MariaDB 초기화 스크립트를 찾을 수 없습니다."
    echo "💡 수동으로 MariaDB를 설정하세요."
fi

# 기존 프로세스 종료
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "기존 프로세스 종료 중 (PID: $OLD_PID)..."
        kill "$OLD_PID"
        sleep 2
    fi
    rm -f "$PID_FILE"
fi

# 서비스 시작
echo "서비스 시작 중..."
# NAS 환경 변수 설정
export NODE_ENV=production
export DEPLOY_ENV=nas
export HOST=0.0.0.0
export PORT=3005

nohup $NODE_PATH server.js > "$LOG_FILE" 2>&1 &
NEW_PID=$!

# PID 저장
echo $NEW_PID > "$PID_FILE"

echo "서비스가 시작되었습니다. PID: $NEW_PID"
echo "로그 확인: tail -f $LOG_FILE"
echo "서비스 중지: kill $NEW_PID"
