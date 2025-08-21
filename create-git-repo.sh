#!/bin/bash

# 시놀로지 NAS Git 저장소 생성 스크립트 (개선 버전)
# 사용법: ./create-git-repo.sh [repo-name] [git-dir]

# 기본 설정
DEFAULT_GIT_DIR="/volume1/git"
DEFAULT_REPO_NAME="jaryo-file-manager"

# 매개변수 처리
REPO_NAME="${1:-$DEFAULT_REPO_NAME}"
GIT_DIR="${2:-$DEFAULT_GIT_DIR}"
REPO_PATH="$GIT_DIR/$REPO_NAME.git"

echo "=== 시놀로지 NAS Git 저장소 생성 ==="
echo "저장소 이름: $REPO_NAME"
echo "Git 디렉토리: $GIT_DIR"
echo "저장소 경로: $REPO_PATH"
echo "=========================================="

# 권한 확인
if [ "$EUID" -ne 0 ] && [ "$(whoami)" != "admin" ]; then
    echo "⚠️  경고: 관리자 권한이 필요할 수 있습니다."
    echo "sudo 또는 admin 계정으로 실행하세요."
fi

# Git 설치 확인
if ! command -v git &> /dev/null; then
    echo "❌ Git이 설치되지 않았습니다."
    echo "패키지 센터에서 Git Server를 설치하거나 다음 명령어를 실행하세요:"
    echo "sudo apt update && sudo apt install git"
    exit 1
fi

# Git 디렉토리 확인 및 생성
echo "📁 Git 디렉토리 확인 중..."
if [ ! -d "$GIT_DIR" ]; then
    echo "Git 디렉토리가 없습니다. 생성 중..."
    mkdir -p "$GIT_DIR" || {
        echo "❌ Git 디렉토리 생성 실패. 권한을 확인하세요."
        exit 1
    }
    
    # 권한 설정
    if command -v chown &> /dev/null; then
        chown admin:users "$GIT_DIR" 2>/dev/null || echo "⚠️  chown 권한 부족"
    fi
    chmod 755 "$GIT_DIR" 2>/dev/null || echo "⚠️  chmod 권한 부족"
    echo "✅ Git 디렉토리 생성 완료: $GIT_DIR"
else
    echo "✅ Git 디렉토리 존재 확인: $GIT_DIR"
fi

# 기존 저장소 확인
if [ -d "$REPO_PATH" ]; then
    echo "⚠️  저장소가 이미 존재합니다: $REPO_PATH"
    read -p "삭제 후 재생성하시겠습니까? (y/N): " confirm
    if [[ $confirm =~ ^[Yy]$ ]]; then
        rm -rf "$REPO_PATH"
        echo "🗑️  기존 저장소 삭제 완료"
    else
        echo "❌ 작업을 취소합니다."
        exit 1
    fi
fi

# 저장소 디렉토리 생성
echo "📂 저장소 디렉토리 생성 중..."
mkdir -p "$REPO_PATH" || {
    echo "❌ 저장소 디렉토리 생성 실패"
    exit 1
}

# Git 저장소 초기화
echo "🔧 Git 저장소 초기화 중..."
cd "$REPO_PATH" || exit 1
git init --bare || {
    echo "❌ Git 저장소 초기화 실패"
    exit 1
}

# 권한 설정
echo "🔐 권한 설정 중..."
if command -v chown &> /dev/null; then
    chown -R admin:users "$REPO_PATH" 2>/dev/null || echo "⚠️  chown 권한 부족"
fi
chmod -R 755 "$REPO_PATH" 2>/dev/null || echo "⚠️  chmod 권한 부족"

# Git hooks 설정 (선택사항)
echo "🪝 Git hooks 설정 중..."
cat > "$REPO_PATH/hooks/post-receive" << 'EOF'
#!/bin/bash
# 자동 배포 hook (선택사항)
echo "푸시 완료: $(date)"
echo "저장소: $PWD"
EOF
chmod +x "$REPO_PATH/hooks/post-receive" 2>/dev/null

# 저장소 설명 파일 생성
echo "📄 저장소 설명 파일 생성 중..."
cat > "$REPO_PATH/description" << EOF
Jaryo File Manager - 시놀로지 NAS 자료실 파일 관리 시스템
EOF

# Git 서비스 확인 및 시작
echo "🔄 Git 서비스 상태 확인 중..."
NAS_IP=$(hostname -I | awk '{print $1}' | tr -d ' ')

# 다양한 방법으로 IP 확인
if [ -z "$NAS_IP" ]; then
    NAS_IP=$(ip route get 1 | awk '{print $7; exit}' 2>/dev/null)
fi
if [ -z "$NAS_IP" ]; then
    NAS_IP="your-nas-ip"
fi

echo "✅ Git 저장소 생성 완료!"
echo "=========================================="
echo "📋 저장소 정보:"
echo "  - 이름: $REPO_NAME"
echo "  - 경로: $REPO_PATH"
echo "  - 설명: 자료실 파일 관리 시스템"
echo ""
echo "🌐 연결 URL:"
echo "  SSH:  ssh://admin@$NAS_IP$REPO_PATH"
echo "  HTTP: http://$NAS_IP:3000/git/$REPO_NAME.git"
echo ""
echo "🔗 로컬에서 연결하는 방법:"
echo "  git remote add nas ssh://admin@$NAS_IP$REPO_PATH"
echo "  git push nas master"
echo ""
echo "📝 다음 단계:"
echo "  1. 로컬 프로젝트에서 원격 저장소 추가"
echo "  2. 첫 번째 push 실행"
echo "  3. Git 서비스 동작 확인"
echo ""
echo "🔧 Git 서비스 수동 시작 (필요시):"
echo "  sudo systemctl start git-daemon"
echo "  sudo git daemon --base-path=$GIT_DIR --export-all --reuseaddr &"
echo ""
echo "📖 자세한 설정은 synology-git-diagnostic.md 파일을 참조하세요."
