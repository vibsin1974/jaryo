# 시놀로지 NAS Git 서버 연결 테스트 가이드

## 🧪 연결 테스트 단계별 가이드

### 1단계: 기본 연결 테스트

#### 1.1 SSH 연결 확인
```bash
# NAS SSH 연결 테스트
ssh admin@your-nas-ip

# 성공시 NAS 터미널에 접속됨
# 실패시 확인사항:
# - SSH 서비스 활성화 여부
# - 방화벽 설정
# - IP 주소 정확성
```

#### 1.2 Git 설치 확인
```bash
# NAS에서 Git 명령어 확인
which git
git --version

# Git 서비스 상태 확인
sudo systemctl status git-daemon
ps aux | grep git
```

### 2단계: 저장소 생성 및 설정

#### 2.1 자동 스크립트 실행
```bash
# 로컬에서 NAS로 스크립트 복사
scp create-git-repo.sh admin@your-nas-ip:/tmp/

# NAS에서 스크립트 실행
ssh admin@your-nas-ip
cd /tmp
chmod +x create-git-repo.sh
./create-git-repo.sh jaryo-file-manager
```

#### 2.2 수동 저장소 생성 (스크립트 실패시)
```bash
# NAS에서 직접 실행
ssh admin@your-nas-ip

# Git 디렉토리 생성
sudo mkdir -p /volume1/git
sudo chown admin:users /volume1/git
cd /volume1/git

# Bare 저장소 생성
mkdir jaryo-file-manager.git
cd jaryo-file-manager.git
git init --bare
sudo chown -R admin:users .
```

### 3단계: 로컬에서 연결 테스트

#### 3.1 기존 프로젝트에 원격 저장소 추가
```bash
# 현재 jaryo 프로젝트 디렉토리에서
cd /c/Users/COMTREE/claude_code/jaryo

# NAS Git 원격 저장소 추가
git remote add nas ssh://admin@your-nas-ip/volume1/git/jaryo-file-manager.git

# 원격 저장소 확인
git remote -v
```

#### 3.2 첫 번째 Push 테스트
```bash
# 모든 변경사항 커밋 (필요시)
git add .
git commit -m "Initial commit for NAS deployment"

# NAS로 푸시
git push nas master

# 성공시 출력 예시:
# Enumerating objects: X, done.
# Counting objects: 100% (X/X), done.
# Delta compression using up to Y threads
# Compressing objects: 100% (X/X), done.
# Writing objects: 100% (X/X), X.XX KiB | X.XX MiB/s, done.
# Total X (delta X), reused X (delta X), pack-reused 0
# To ssh://admin@your-nas-ip/volume1/git/jaryo-file-manager.git
#  * [new branch]      master -> master
```

### 4단계: 클론 테스트

#### 4.1 다른 디렉토리에서 클론 테스트
```bash
# 테스트용 디렉토리 생성
mkdir /tmp/git-test
cd /tmp/git-test

# NAS에서 클론
git clone ssh://admin@your-nas-ip/volume1/git/jaryo-file-manager.git

# 성공시 프로젝트 파일들이 다운로드됨
cd jaryo-file-manager
ls -la
```

#### 4.2 HTTP 클론 테스트 (Git HTTP 서버 실행시)
```bash
# Git HTTP 서버가 실행 중인 경우
git clone http://your-nas-ip:3000/jaryo-file-manager.git
```

### 5단계: 웹 인터페이스 테스트

#### 5.1 GitWeb 접속 테스트
- 브라우저에서 `http://your-nas-ip/git` 접속
- 또는 `http://your-nas-ip:3000` 접속
- 저장소 목록에서 `jaryo-file-manager` 확인

#### 5.2 Git HTTP 서버 상태 확인
```bash
# NAS에서 Git HTTP 서버 실행 확인
sudo netstat -tulpn | grep :3000
ps aux | grep git-daemon
```

## 🚨 문제 해결

### 연결 실패 시 체크리스트

#### ❌ "Connection refused" 오류
```bash
# 1. SSH 서비스 확인
ssh -v admin@your-nas-ip

# 2. 포트 확인 (기본: 22)
ssh -p 22 admin@your-nas-ip

# 3. 방화벽 확인
# DSM > 제어판 > 보안 > 방화벽
```

#### ❌ "Permission denied" 오류
```bash
# 1. 사용자 권한 확인
# DSM > 제어판 > 사용자 및 그룹 > admin > 애플리케이션

# 2. SSH 키 설정 (선택사항)
ssh-keygen -t rsa
ssh-copy-id admin@your-nas-ip
```

#### ❌ "Repository not found" 오류
```bash
# 1. 저장소 경로 확인
ssh admin@your-nas-ip
ls -la /volume1/git/
ls -la /volume1/git/jaryo-file-manager.git/

# 2. 권한 확인
sudo chown -R admin:users /volume1/git/jaryo-file-manager.git
chmod -R 755 /volume1/git/jaryo-file-manager.git
```

#### ❌ Git 명령어 없음
```bash
# Git 설치 확인
which git

# 패키지 센터에서 Git Server 설치
# 또는 수동 설치:
sudo apt update
sudo apt install git
```

### 네트워크 설정 문제

#### 내부 네트워크 접속 실패
```bash
# IP 주소 확인
ping your-nas-ip
nslookup your-nas-ip

# 포트 스캔
nmap -p 22,3000 your-nas-ip
```

#### 외부 네트워크 접속 설정
```bash
# 라우터 포트 포워딩 설정
# 22 (SSH) -> NAS_IP:22
# 3000 (Git HTTP) -> NAS_IP:3000

# 동적 DNS 설정 (선택사항)
# your-domain.dyndns.org -> your-public-ip
```

## 📊 연결 성공 확인

### ✅ 성공 지표들

1. **SSH 연결**: `ssh admin@your-nas-ip` 성공
2. **저장소 존재**: `/volume1/git/jaryo-file-manager.git` 확인
3. **Push 성공**: `git push nas master` 완료
4. **Clone 성공**: 다른 위치에서 클론 가능
5. **웹 접속**: 브라우저에서 Git 저장소 확인

### 📈 성능 테스트

```bash
# 대용량 파일 Push 테스트
dd if=/dev/zero of=test-large-file.bin bs=1M count=10
git add test-large-file.bin
git commit -m "Large file test"
time git push nas master

# 클론 속도 테스트
time git clone ssh://admin@your-nas-ip/volume1/git/jaryo-file-manager.git test-clone
```

## 🔧 고급 설정

### Git Hooks 활용
```bash
# NAS에서 post-receive hook 설정
ssh admin@your-nas-ip
cd /volume1/git/jaryo-file-manager.git/hooks

# 자동 배포 hook
cat > post-receive << 'EOF'
#!/bin/bash
echo "코드 푸시 완료: $(date)"
# 자동 배포 로직 추가 가능
# cd /volume1/web/jaryo && git pull
EOF

chmod +x post-receive
```

### 백업 설정
```bash
# 저장소 백업 스크립트
#!/bin/bash
BACKUP_DIR="/volume1/backup/git"
REPO_DIR="/volume1/git"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/git-repos-$DATE.tar.gz" -C "$REPO_DIR" .
echo "백업 완료: $BACKUP_DIR/git-repos-$DATE.tar.gz"
```

이 가이드를 따라하면 시놀로지 NAS Git 서버와의 연결을 성공적으로 테스트하고 설정할 수 있습니다.