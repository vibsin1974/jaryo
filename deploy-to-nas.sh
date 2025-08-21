#!/bin/bash

# 시놀로지 NAS 자료실 배포 스크립트
# 사용법: ./deploy-to-nas.sh [nas-ip] [project-name]

# 기본 설정
NAS_IP="${1:-119.64.1.86}"
PROJECT_NAME="${2:-jaryo}"
DEPLOY_DIR="/volume1/web/$PROJECT_NAME"
SERVICE_PORT="3005"
GITEA_URL="http://$NAS_IP:3000/vibsin9322/jaryo.git"

echo "=========================================="
echo "🚀 시놀로지 NAS 자료실 배포 시작"
echo "=========================================="
echo "NAS IP: $NAS_IP"
echo "프로젝트: $PROJECT_NAME"
echo "배포 경로: $DEPLOY_DIR"
echo "서비스 포트: $SERVICE_PORT"
echo "Gitea URL: $GITEA_URL"
echo "=========================================="

# 사전 요구사항 확인
echo "📋 1단계: 사전 요구사항 확인"

# SSH 연결 테스트 (포트 2222)
echo "🔗 SSH 연결 테스트 중... (포트 2222)"
if ! ssh -p 2222 -o ConnectTimeout=5 admin@$NAS_IP "echo 'SSH 연결 성공'" 2>/dev/null; then
    echo "❌ SSH 연결 실패. 다음을 확인하세요:"
    echo "   - NAS IP 주소: $NAS_IP"
    echo "   - SSH 포트: 2222"
    echo "   - SSH 서비스 활성화 (DSM > 제어판 > 터미널 및 SNMP)"
    echo "   - 방화벽 설정 (포트 2222 허용)"
    exit 1
fi
echo "✅ SSH 연결 성공"

# Node.js 설치 확인
echo "📦 Node.js 설치 확인 중..."
ssh -p 2222 admin@$NAS_IP "which node" >/dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Node.js가 설치되지 않았습니다."
    echo "DSM 패키지 센터에서 Node.js를 설치하세요."
    exit 1
fi

NODE_VERSION=$(ssh -p 2222 admin@$NAS_IP "node --version")
echo "✅ Node.js 설치됨: $NODE_VERSION"

# Git 설치 확인
echo "📦 Git 설치 확인 중..."
ssh -p 2222 admin@$NAS_IP "which git" >/dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Git이 설치되지 않았습니다."
    echo "DSM 패키지 센터에서 Git Server를 설치하거나 다음 명령을 실행하세요:"
    echo "ssh -p 2222 admin@$NAS_IP 'sudo apt update && sudo apt install git'"
    exit 1
fi

GIT_VERSION=$(ssh -p 2222 admin@$NAS_IP "git --version")
echo "✅ Git 설치됨: $GIT_VERSION"

# 2단계: 소스 코드 배포
echo ""
echo "📂 2단계: 소스 코드 배포"

# 기존 배포 디렉토리 확인
echo "🗂️  배포 디렉토리 확인 중..."
ssh -p 2222 admin@$NAS_IP "
if [ -d '$DEPLOY_DIR' ]; then
    echo '⚠️  기존 배포가 존재합니다: $DEPLOY_DIR'
    echo '백업 생성 중...'
    sudo cp -r '$DEPLOY_DIR' '${DEPLOY_DIR}_backup_$(date +%Y%m%d_%H%M%S)'
    echo '기존 배포 제거 중...'
    sudo rm -rf '$DEPLOY_DIR'
fi
"

# 배포 디렉토리 생성
echo "📁 배포 디렉토리 생성 중..."
ssh -p 2222 admin@$NAS_IP "
sudo mkdir -p '$DEPLOY_DIR'
sudo chown admin:users '$DEPLOY_DIR'
cd '$DEPLOY_DIR'
"

# Git 클론
echo "📥 Gitea에서 소스 코드 클론 중..."
ssh -p 2222 admin@$NAS_IP "
cd '$DEPLOY_DIR'
git clone '$GITEA_URL' .
if [ \$? -ne 0 ]; then
    echo '❌ Git 클론 실패'
    exit 1
fi
echo '✅ 소스 코드 클론 완료'
"

# 3단계: 의존성 설치 및 빌드
echo ""
echo "🔧 3단계: 의존성 설치 및 빌드"

ssh -p 2222 admin@$NAS_IP "
cd '$DEPLOY_DIR'

# 기존 node_modules 제거
if [ -d 'node_modules' ]; then
    echo '🗑️  기존 node_modules 제거 중...'
    rm -rf node_modules package-lock.json
fi

# 의존성 설치
echo '📦 의존성 설치 중...'
npm install

if [ \$? -ne 0 ]; then
    echo '❌ npm install 실패'
    exit 1
fi
echo '✅ 의존성 설치 완료'

# 데이터베이스 초기화
if [ -f 'scripts/init-database.js' ]; then
    echo '🗄️  데이터베이스 초기화 중...'
    npm run init-db
    echo '✅ 데이터베이스 초기화 완료'
fi
"

# 4단계: 서비스 설정
echo ""
echo "⚙️  4단계: 서비스 설정"

# 시작 스크립트 생성
echo "📝 시작 스크립트 생성 중..."
ssh -p 2222 admin@$NAS_IP "
cat > '$DEPLOY_DIR/start-nas-service.sh' << 'EOF'
#!/bin/bash

# 자료실 NAS 서비스 시작 스크립트
PROJECT_DIR='$DEPLOY_DIR'
SERVICE_PORT='$SERVICE_PORT'
PID_FILE='\$PROJECT_DIR/jaryo-nas.pid'
LOG_FILE='\$PROJECT_DIR/logs/app.log'

# 로그 디렉토리 생성
mkdir -p '\$PROJECT_DIR/logs'

# 기존 프로세스 확인 및 종료
if [ -f '\$PID_FILE' ]; then
    OLD_PID=\$(cat '\$PID_FILE')
    if kill -0 '\$OLD_PID' 2>/dev/null; then
        echo '기존 서비스 종료 중... (PID: '\$OLD_PID')'
        kill '\$OLD_PID'
        sleep 2
    fi
    rm -f '\$PID_FILE'
fi

# 포트 사용 확인
if netstat -tulpn | grep :'$SERVICE_PORT' >/dev/null; then
    echo '⚠️  포트 '$SERVICE_PORT'가 이미 사용 중입니다.'
    echo '사용 중인 프로세스:'
    netstat -tulpn | grep :'$SERVICE_PORT'
    exit 1
fi

# 서비스 시작
echo '🚀 자료실 서비스 시작 중...'
cd '\$PROJECT_DIR'
PORT='$SERVICE_PORT' nohup node server.js > '\$LOG_FILE' 2>&1 &
echo \$! > '\$PID_FILE'

sleep 2

# 시작 확인
if kill -0 \$(cat '\$PID_FILE') 2>/dev/null; then
    echo '✅ 자료실 서비스 시작 완료!'
    echo '📍 접속 URL: http://$NAS_IP:$SERVICE_PORT'
    echo '📋 PID: '\$(cat '\$PID_FILE')
    echo '📄 로그: '\$LOG_FILE'
else
    echo '❌ 서비스 시작 실패'
    echo '로그 확인:'
    tail -20 '\$LOG_FILE'
    exit 1
fi
EOF

chmod +x '$DEPLOY_DIR/start-nas-service.sh'
"

# 중지 스크립트 생성
echo "📝 중지 스크립트 생성 중..."
ssh -p 2222 admin@$NAS_IP "
cat > '$DEPLOY_DIR/stop-nas-service.sh' << 'EOF'
#!/bin/bash

# 자료실 NAS 서비스 중지 스크립트
PROJECT_DIR='$DEPLOY_DIR'
PID_FILE='\$PROJECT_DIR/jaryo-nas.pid'

if [ -f '\$PID_FILE' ]; then
    PID=\$(cat '\$PID_FILE')
    if kill -0 '\$PID' 2>/dev/null; then
        echo '🛑 자료실 서비스 중지 중... (PID: '\$PID')'
        kill '\$PID'
        sleep 2
        
        # 강제 종료 확인
        if kill -0 '\$PID' 2>/dev/null; then
            echo '⚡ 강제 종료 중...'
            kill -9 '\$PID'
        fi
        
        rm -f '\$PID_FILE'
        echo '✅ 자료실 서비스 중지 완료'
    else
        echo '⚠️  프로세스가 이미 종료됨'
        rm -f '\$PID_FILE'
    fi
else
    echo '⚠️  PID 파일이 없습니다. 수동으로 프로세스를 확인하세요.'
    echo '실행 중인 Node.js 프로세스:'
    ps aux | grep 'node.*server.js' | grep -v grep
fi
EOF

chmod +x '$DEPLOY_DIR/stop-nas-service.sh'
"

# 5단계: 서비스 시작
echo ""
echo "🎬 5단계: 서비스 시작"

ssh -p 2222 admin@$NAS_IP "$DEPLOY_DIR/start-nas-service.sh"

# 6단계: 접속 테스트
echo ""
echo "🧪 6단계: 접속 테스트"

sleep 3

echo "🌐 서비스 상태 확인 중..."
if curl -s "http://$NAS_IP:$SERVICE_PORT" >/dev/null; then
    echo "✅ 자료실 서비스 정상 작동!"
    echo ""
    echo "=========================================="
    echo "🎉 배포 완료!"
    echo "=========================================="
    echo "📍 접속 URL: http://$NAS_IP:$SERVICE_PORT"
    echo "🔧 관리자 URL: http://$NAS_IP:$SERVICE_PORT/admin"
    echo "📂 배포 경로: $DEPLOY_DIR"
    echo "📄 로그 파일: $DEPLOY_DIR/logs/app.log"
    echo ""
    echo "🔧 서비스 관리:"
    echo "  시작: ssh -p 2222 admin@$NAS_IP '$DEPLOY_DIR/start-nas-service.sh'"
    echo "  중지: ssh -p 2222 admin@$NAS_IP '$DEPLOY_DIR/stop-nas-service.sh'"
    echo "  로그: ssh -p 2222 admin@$NAS_IP 'tail -f $DEPLOY_DIR/logs/app.log'"
    echo ""
    echo "📱 브라우저에서 http://$NAS_IP:$SERVICE_PORT 접속하세요!"
else
    echo "❌ 서비스 접속 실패"
    echo "로그 확인:"
    ssh -p 2222 admin@$NAS_IP "tail -20 $DEPLOY_DIR/logs/app.log"
fi