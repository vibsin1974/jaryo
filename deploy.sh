#!/bin/bash

# Git을 통한 자동 배포 스크립트
# 사용법: ./deploy.sh [branch_name]

# 설정
PROJECT_DIR="/volume1/web/jaryo"
GIT_REPO="/volume1/git/jaryo-file-manager.git"
BACKUP_DIR="/volume1/web/jaryo-backup"
LOG_FILE="/volume1/web/jaryo/logs/deploy.log"
BRANCH=${1:-main}

# 로그 함수
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 로그 디렉토리 생성
mkdir -p "$(dirname $LOG_FILE)"

log "=== 배포 시작 ==="
log "브랜치: $BRANCH"
log "프로젝트 디렉토리: $PROJECT_DIR"

# 1. 현재 서비스 중지
log "기존 서비스 중지 중..."
if [ -f "$PROJECT_DIR/app.pid" ]; then
    PID=$(cat "$PROJECT_DIR/app.pid")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        sleep 3
        log "서비스 중지 완료 (PID: $PID)"
    fi
fi

# 2. 백업 생성
log "현재 버전 백업 중..."
BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
if [ -d "$PROJECT_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    cp -r "$PROJECT_DIR" "$BACKUP_DIR/$BACKUP_NAME"
    log "백업 완료: $BACKUP_DIR/$BACKUP_NAME"
fi

# 3. Git에서 최신 코드 가져오기
log "Git에서 최신 코드 가져오는 중..."
if [ ! -d "$PROJECT_DIR" ]; then
    mkdir -p "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    git clone "$GIT_REPO" .
else
    cd "$PROJECT_DIR"
    # 현재 변경사항 백업
    git stash push -m "Auto backup before deploy $(date)"
    
    # 원격 저장소에서 최신 정보 가져오기
    git fetch origin
    
    # 지정된 브랜치로 체크아웃
    git checkout "$BRANCH"
    
    # 원격 브랜치와 동기화
    git pull origin "$BRANCH"
fi

# 4. 의존성 설치
log "의존성 설치 중..."
npm install --production

# 5. 데이터베이스 마이그레이션 (필요한 경우)
log "데이터베이스 초기화 중..."
node scripts/init-database.js

# 6. 권한 설정
log "권한 설정 중..."
chmod +x *.sh
chown -R admin:users "$PROJECT_DIR"

# 7. 서비스 시작
log "새로운 서비스 시작 중..."
./start-service.sh

# 8. 서비스 상태 확인
sleep 5
if [ -f "$PROJECT_DIR/app.pid" ]; then
    PID=$(cat "$PROJECT_DIR/app.pid")
    if kill -0 "$PID" 2>/dev/null; then
        log "✅ 배포 성공! 서비스가 정상적으로 시작되었습니다. (PID: $PID)"
    else
        log "❌ 배포 실패! 서비스가 시작되지 않았습니다."
        log "로그 확인: tail -f $PROJECT_DIR/logs/app.log"
        exit 1
    fi
else
    log "❌ 배포 실패! PID 파일이 생성되지 않았습니다."
    exit 1
fi

# 9. 이전 백업 정리 (30일 이상 된 백업 삭제)
log "오래된 백업 정리 중..."
find "$BACKUP_DIR" -name "backup-*" -type d -mtime +30 -exec rm -rf {} \; 2>/dev/null

log "=== 배포 완료 ==="
log "서비스 URL: http://$(hostname -I | awk '{print $1}'):3005"
