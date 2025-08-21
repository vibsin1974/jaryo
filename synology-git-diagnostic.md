# 시놀로지 NAS Git Server 진단 및 해결 가이드

## 🔍 1단계: Git Server 패키지 상태 확인

### 1.1 DSM 패키지 센터 점검
1. **DSM 로그인** → **패키지 센터**
2. **설치됨** 탭에서 "Git Server" 검색
3. 상태 확인:
   - ✅ **실행 중**: 정상 동작
   - ⚠️ **중지됨**: 서비스 시작 필요
   - ❌ **미설치**: 패키지 설치 필요

### 1.2 Git Server 서비스 시작
```bash
# SSH로 NAS 접속 후
sudo systemctl status git-daemon
sudo systemctl start git-daemon
sudo systemctl enable git-daemon
```

## 🛠️ 2단계: 기본 설정 확인

### 2.1 SSH 서비스 활성화
1. **DSM 제어판** → **터미널 및 SNMP**
2. **SSH 서비스 활성화** 체크
3. 포트 번호 확인 (기본: 22)

### 2.2 사용자 권한 설정
1. **DSM 제어판** → **사용자 및 그룹**
2. 사용자 선택 → **편집** → **애플리케이션**
3. **Git Server** 권한 부여

### 2.3 방화벽 설정
1. **DSM 제어판** → **보안** → **방화벽**
2. 다음 포트 허용:
   - SSH: 22
   - Git HTTP: 3000
   - Git HTTPS: 3001

## 📁 3단계: Git 디렉토리 구조 확인

### 3.1 기본 경로 확인
```bash
# SSH 접속 후 확인
ls -la /volume1/
ls -la /volume1/git/

# Git 설정 디렉토리 확인
ls -la /usr/local/git/
```

### 3.2 권한 문제 해결
```bash
# Git 디렉토리 생성
sudo mkdir -p /volume1/git
sudo chown -R admin:users /volume1/git
sudo chmod 755 /volume1/git

# Git Server 사용자 추가 (필요시)
sudo adduser git
sudo usermod -a -G users git
```

## 🔧 4단계: 레포지토리 수동 생성

### 4.1 Bare 레포지토리 생성
```bash
# SSH로 NAS 접속
ssh admin@your-nas-ip

# 프로젝트 디렉토리 생성
cd /volume1/git
sudo mkdir jaryo-file-manager.git
cd jaryo-file-manager.git

# Bare 레포지토리 초기화
sudo git init --bare
sudo chown -R admin:users .
```

### 4.2 웹 인터페이스 활성화
```bash
# Git HTTP 서버 시작
cd /volume1/git
sudo git daemon --reuseaddr --base-path=. --export-all --verbose --enable=receive-pack
```

## 🌐 5단계: 웹 인터페이스 설정

### 5.1 Git Web 설정
```bash
# CGit 또는 GitWeb 설치
sudo apt update
sudo apt install gitweb

# Apache 설정 (Web Station 사용시)
sudo ln -s /usr/share/gitweb /volume1/web/git
```

### 5.2 브라우저에서 접속
- URL: `http://your-nas-ip/git`
- 또는: `http://your-nas-ip:3000`

## 🚨 6단계: 문제 해결

### 6.1 "레포지토리 설정이 안보임" 해결
**원인 1: Git Server 패키지 미설치**
```bash
# 패키지 센터에서 Git Server 재설치
# 또는 수동 Git 설치
sudo apt update
sudo apt install git git-daemon-run
```

**원인 2: 서비스 시작 실패**
```bash
# 서비스 상태 확인
sudo systemctl status git-daemon
sudo journalctl -u git-daemon

# 수동 재시작
sudo systemctl restart git-daemon
```

**원인 3: 권한 문제**
```bash
# 권한 재설정
sudo chown -R www-data:www-data /volume1/git
sudo chmod -R 755 /volume1/git
```

### 6.2 포트 충돌 해결
```bash
# 포트 사용 확인
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :22

# 다른 포트로 변경
sudo git daemon --port=3001 --reuseaddr --base-path=/volume1/git --export-all
```

## 📋 7단계: 연결 테스트

### 7.1 로컬에서 연결 테스트
```bash
# SSH 연결 테스트
ssh admin@your-nas-ip

# Git 클론 테스트
git clone ssh://admin@your-nas-ip/volume1/git/jaryo-file-manager.git

# 또는 HTTP 연결
git clone http://your-nas-ip:3000/jaryo-file-manager.git
```

### 7.2 기존 프로젝트 푸시
```bash
# 기존 프로젝트에서
git remote add nas ssh://admin@your-nas-ip/volume1/git/jaryo-file-manager.git
git push nas master
```

## 🔄 8단계: 자동화 설정

### 8.1 systemd 서비스 생성
```bash
# /etc/systemd/system/git-daemon.service
sudo tee /etc/systemd/system/git-daemon.service << EOF
[Unit]
Description=Git Daemon
After=network.target

[Service]
ExecStart=/usr/bin/git daemon --reuseaddr --base-path=/volume1/git --export-all --verbose --enable=receive-pack
Restart=always
User=git
Group=git

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable git-daemon
sudo systemctl start git-daemon
```

## 📊 요약

레포지토리 설정이 보이지 않는 주요 원인:
1. ❌ Git Server 패키지 미설치/미실행
2. ❌ SSH 서비스 비활성화
3. ❌ 사용자 권한 부족
4. ❌ 방화벽 차단
5. ❌ Git 디렉토리 부재

해결 순서:
1. 패키지 설치/재시작
2. SSH 및 권한 설정
3. 수동 레포지토리 생성
4. 연결 테스트
5. 자동화 설정

이 가이드를 따라하면 시놀로지 NAS에서 Git 레포지토리를 성공적으로 설정할 수 있습니다.