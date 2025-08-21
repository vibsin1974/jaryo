#!/bin/bash

# PM2를 사용한 시놀로지 NAS 서비스 시작 스크립트
# 사용법: ./pm2-start.sh

PROJECT_DIR="/volume1/web/jaryo"
LOG_DIR="/volume1/web/jaryo/logs"

echo "=== PM2로 Jaryo File Manager 서비스 시작 ==="

# 로그 디렉토리 생성
mkdir -p "$LOG_DIR"

# 프로젝트 디렉토리로 이동
cd "$PROJECT_DIR" || {
    echo "오류: 프로젝트 디렉토리를 찾을 수 없습니다: $PROJECT_DIR"
    exit 1
}

# PM2 설치 확인 및 설치
if ! command -v pm2 &> /dev/null; then
    echo "PM2 설치 중..."
    npm install -g pm2
fi

# 의존성 설치 확인
if [ ! -d "node_modules" ]; then
    echo "의존성 설치 중..."
    npm install
fi

# 데이터베이스 초기화
echo "데이터베이스 초기화 중..."
node scripts/init-database.js

# 기존 PM2 프로세스 중지
echo "기존 프로세스 정리 중..."
pm2 delete jaryo-file-manager 2>/dev/null || true

# PM2로 서비스 시작
echo "PM2로 서비스 시작 중..."
pm2 start pm2-ecosystem.config.js --env production

# PM2 시작 스크립트 생성
pm2 startup
pm2 save

echo "서비스가 PM2로 시작되었습니다."
echo "상태 확인: pm2 status"
echo "로그 확인: pm2 logs jaryo-file-manager"
echo "서비스 중지: pm2 stop jaryo-file-manager"
