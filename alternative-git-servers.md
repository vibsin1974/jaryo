# 시놀로지 NAS 대안 Git 서버 설치 방안

## 🚀 개요

시놀로지 Git Server 패키지가 작동하지 않을 때 사용할 수 있는 대안적인 Git 서버 설치 방법들을 제공합니다.

## 🐳 방법 1: Docker를 이용한 Gitea 설치 (권장)

### 1.1 장점
- 웹 기반 Git 관리 인터페이스
- GitHub와 유사한 사용자 경험
- 이슈 관리, 위키, 프로젝트 관리 기능
- 가벼움 (Go 언어 기반)

### 1.2 설치 과정

#### Docker 설치 확인
```bash
# DSM > 패키지 센터 > Docker 설치
# 또는 SSH에서 확인
docker --version
```

#### Gitea 컨테이너 실행
```bash
# SSH로 NAS 접속
ssh admin@your-nas-ip

# Gitea 데이터 디렉토리 생성
sudo mkdir -p /volume1/docker/gitea

# Gitea 컨테이너 실행
docker run -d \
  --name gitea \
  -p 3000:3000 \
  -p 222:22 \
  -v /volume1/docker/gitea:/data \
  -e USER_UID=1000 \
  -e USER_GID=1000 \
  gitea/gitea:latest
```

#### 웹 설정
1. 브라우저에서 `http://your-nas-ip:3000` 접속
2. 초기 설정 완료:
   - 데이터베이스: SQLite3 (기본)
   - 관리자 계정 생성
   - 저장소 루트 경로: `/data/git/repositories`

### 1.3 저장소 생성 및 연결
```bash
# 웹 인터페이스에서 새 저장소 'jaryo-file-manager' 생성
# 로컬에서 연결
git remote add gitea http://your-nas-ip:3000/username/jaryo-file-manager.git
git push gitea master
```

## 📦 방법 2: 순수 Git 서버 설치

### 2.1 수동 Git 설치
```bash
# SSH로 NAS 접속
ssh admin@your-nas-ip

# 패키지 관리자 업데이트
sudo apt update

# Git 설치
sudo apt install git git-daemon-run

# 버전 확인
git --version
```

### 2.2 Git 서비스 설정
```bash
# Git 사용자 생성
sudo adduser git
sudo su git
cd /home/git

# SSH 키 디렉토리 생성
mkdir .ssh && chmod 700 .ssh
touch .ssh/authorized_keys && chmod 600 .ssh/authorized_keys

# Git 저장소 디렉토리 생성
mkdir /home/git/repositories
```

### 2.3 systemd 서비스 설정
```bash
# Git daemon 서비스 파일 생성
sudo tee /etc/systemd/system/git-daemon.service << EOF
[Unit]
Description=Git Daemon
After=network.target

[Service]
ExecStart=/usr/bin/git daemon --reuseaddr --base-path=/home/git/repositories --export-all --verbose --enable=receive-pack
Restart=always
User=git
Group=git
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 서비스 활성화
sudo systemctl enable git-daemon
sudo systemctl start git-daemon
sudo systemctl status git-daemon
```

### 2.4 저장소 생성
```bash
# git 사용자로 전환
sudo su git
cd /home/git/repositories

# bare 저장소 생성
git init --bare jaryo-file-manager.git
```

## 🌐 방법 3: GitLab CE Docker 설치

### 3.1 특징
- 기업급 Git 관리 플랫폼
- CI/CD 파이프라인 지원
- 이슈 추적, 위키, 프로젝트 관리
- 더 많은 리소스 필요

### 3.2 설치 과정
```bash
# GitLab 데이터 디렉토리 생성
sudo mkdir -p /volume1/docker/gitlab/{config,logs,data}

# GitLab 컨테이너 실행 (최소 4GB RAM 권장)
docker run -d \
  --hostname your-nas-ip \
  --name gitlab \
  -p 8080:80 \
  -p 8443:443 \
  -p 8022:22 \
  -v /volume1/docker/gitlab/config:/etc/gitlab \
  -v /volume1/docker/gitlab/logs:/var/log/gitlab \
  -v /volume1/docker/gitlab/data:/var/opt/gitlab \
  gitlab/gitlab-ce:latest
```

### 3.3 초기 설정
```bash
# 컨테이너 시작 대기 (2-3분)
docker logs -f gitlab

# 브라우저에서 http://your-nas-ip:8080 접속
# 초기 root 비밀번호 확인
docker exec -it gitlab grep 'Password:' /etc/gitlab/initial_root_password
```

## 🔧 방법 4: Forgejo (Gitea Fork) 설치

### 4.1 특징
- Gitea의 커뮤니티 중심 포크
- 더 빠른 개발 주기
- 오픈소스 중심

### 4.2 설치 과정
```bash
# Forgejo 데이터 디렉토리 생성
sudo mkdir -p /volume1/docker/forgejo

# Forgejo 컨테이너 실행
docker run -d \
  --name forgejo \
  -p 3000:3000 \
  -p 222:22 \
  -v /volume1/docker/forgejo:/data \
  -e USER_UID=1000 \
  -e USER_GID=1000 \
  codeberg.org/forgejo/forgejo:latest
```

## 📱 방법 5: 간단한 HTTP Git 서버

### 5.1 Python 기반 간단 서버
```bash
# Python Git HTTP 서버 스크립트 생성
cat > /volume1/web/git-http-server.py << 'EOF'
#!/usr/bin/env python3
import os
import http.server
import socketserver
from subprocess import Popen, PIPE

class GitHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.endswith('.git/info/refs'):
            # Git 정보 요청 처리
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            
            repo_path = self.path.split('/')[1]
            git_dir = f'/volume1/git/{repo_path}'
            
            if os.path.exists(git_dir):
                proc = Popen(['git', 'upload-pack', '--advertise-refs', git_dir], 
                           stdout=PIPE, stderr=PIPE)
                output, _ = proc.communicate()
                self.wfile.write(output)
            else:
                self.wfile.write(b'Repository not found')
        else:
            super().do_GET()

PORT = 8000
with socketserver.TCPServer(("", PORT), GitHTTPHandler) as httpd:
    print(f"Git HTTP Server running on port {PORT}")
    httpd.serve_forever()
EOF

# 실행 권한 부여
chmod +x /volume1/web/git-http-server.py

# 서버 실행
python3 /volume1/web/git-http-server.py
```

## 🔀 방법별 비교표

| 방법 | 난이도 | 리소스 사용량 | 기능 | 웹 UI | 권장도 |
|------|--------|---------------|------|-------|--------|
| Gitea | 쉬움 | 낮음 | 풍부 | ✅ | ⭐⭐⭐⭐⭐ |
| 순수 Git | 보통 | 매우 낮음 | 기본 | ❌ | ⭐⭐⭐ |
| GitLab CE | 어려움 | 높음 | 매우 풍부 | ✅ | ⭐⭐⭐⭐ |
| Forgejo | 쉬움 | 낮음 | 풍부 | ✅ | ⭐⭐⭐⭐ |
| Python 서버 | 보통 | 낮음 | 제한적 | ❌ | ⭐⭐ |

## 🚀 빠른 시작 가이드 (Gitea 권장)

### 1단계: Docker 설치 확인
```bash
# DSM 패키지 센터에서 Docker 설치
```

### 2단계: Gitea 설치
```bash
ssh admin@your-nas-ip
sudo mkdir -p /volume1/docker/gitea
docker run -d --name gitea -p 3000:3000 -p 222:22 -v /volume1/docker/gitea:/data gitea/gitea:latest
```

### 3단계: 웹 설정
- `http://your-nas-ip:3000` 접속
- 초기 설정 완료
- 관리자 계정 생성

### 4단계: 저장소 생성 및 연결
```bash
# 웹에서 새 저장소 생성
# 로컬에서 연결
cd /c/Users/COMTREE/claude_code/jaryo
git remote add gitea http://your-nas-ip:3000/admin/jaryo-file-manager.git
git push gitea master
```

## 🛠️ 문제 해결

### Docker 관련 문제
```bash
# 컨테이너 상태 확인
docker ps -a

# 로그 확인
docker logs gitea

# 컨테이너 재시작
docker restart gitea
```

### 포트 충돌 문제
```bash
# 사용 중인 포트 확인
sudo netstat -tulpn | grep :3000

# 다른 포트 사용
docker run -d --name gitea -p 3001:3000 -p 223:22 -v /volume1/docker/gitea:/data gitea/gitea:latest
```

### 권한 문제
```bash
# 데이터 디렉토리 권한 수정
sudo chown -R 1000:1000 /volume1/docker/gitea
```

이 가이드를 통해 시놀로지 NAS Git Server 패키지 문제를 우회하여 안정적인 Git 서버를 구축할 수 있습니다.