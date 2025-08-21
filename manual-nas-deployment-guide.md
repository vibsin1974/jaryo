# 시놀로지 NAS 수동 배포 가이드

## 🚀 시놀로지 NAS에서 자료실 서비스 배포하기

### 사전 준비사항 ✅

1. **DSM 패키지 설치 확인**
   - Node.js v16+ (패키지 센터에서 설치)
   - Git Server (패키지 센터에서 설치)
   - SSH 서비스 활성화 (제어판 > 터미널 및 SNMP)

2. **방화벽 설정**
   - SSH 포트: 2222 허용
   - 서비스 포트: 3005 허용
   - Gitea 포트: 3000 허용

### 1단계: SSH 접속 🔗

```bash
# Windows에서 NAS 접속
ssh -p 2222 admin@119.64.1.86

# 접속 후 관리자 권한 확인
sudo whoami
```

### 2단계: 배포 디렉토리 준비 📁

```bash
# 웹 디렉토리로 이동
cd /volume1/web

# 기존 jaryo 폴더가 있다면 백업
if [ -d "jaryo" ]; then
    sudo mv jaryo jaryo_backup_$(date +%Y%m%d_%H%M%S)
fi

# 새 디렉토리 생성
sudo mkdir -p jaryo
sudo chown admin:users jaryo
cd jaryo
```

### 3단계: 소스 코드 클론 📥

```bash
# Gitea에서 소스 코드 클론
git clone http://119.64.1.86:3000/vibsin9322/jaryo.git .

# 클론 성공 확인
ls -la
```

### 4단계: 의존성 설치 📦

```bash
# 기존 node_modules 제거 (있다면)
rm -rf node_modules package-lock.json

# npm 의존성 설치
npm install

# 설치 확인
ls -la node_modules
```

### 5단계: 데이터베이스 초기화 🗄️

```bash
# SQLite 데이터베이스 초기화
npm run init-db

# 데이터베이스 파일 확인
ls -la *.db
```

### 6단계: 서비스 시작 스크립트 생성 📝

```bash
# 시작 스크립트 생성
cat > start-jaryo.sh << 'EOF'
#!/bin/bash

# 자료실 서비스 시작 스크립트
PROJECT_DIR="/volume1/web/jaryo"
SERVICE_PORT="3005"
PID_FILE="$PROJECT_DIR/jaryo.pid"
LOG_FILE="$PROJECT_DIR/jaryo.log"

# 로그 디렉토리 생성
mkdir -p "$PROJECT_DIR/logs"

# 기존 프로세스 확인 및 종료
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null; then
        echo "기존 서비스 종료 중... (PID: $OLD_PID)"
        kill "$OLD_PID"
        sleep 2
    fi
    rm -f "$PID_FILE"
fi

# 포트 사용 확인
if netstat -tulpn | grep ":$SERVICE_PORT " > /dev/null; then
    echo "⚠️ 포트 $SERVICE_PORT가 이미 사용 중입니다."
    echo "사용 중인 프로세스:"
    netstat -tulpn | grep ":$SERVICE_PORT "
    exit 1
fi

# 서비스 시작
echo "🚀 자료실 서비스 시작 중..."
cd "$PROJECT_DIR"
PORT="$SERVICE_PORT" nohup node server.js > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

sleep 2

# 시작 확인
if ps -p $(cat "$PID_FILE") > /dev/null; then
    echo "✅ 자료실 서비스 시작 완료!"
    echo "📍 접속 URL: http://119.64.1.86:$SERVICE_PORT"
    echo "📋 PID: $(cat "$PID_FILE")"
    echo "📄 로그: $LOG_FILE"
else
    echo "❌ 서비스 시작 실패"
    echo "로그 확인:"
    tail -20 "$LOG_FILE"
    exit 1
fi
EOF

# 실행 권한 부여
chmod +x start-jaryo.sh
```

### 7단계: 중지 스크립트 생성 🛑

```bash
# 중지 스크립트 생성
cat > stop-jaryo.sh << 'EOF'
#!/bin/bash

# 자료실 서비스 중지 스크립트
PROJECT_DIR="/volume1/web/jaryo"
PID_FILE="$PROJECT_DIR/jaryo.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null; then
        echo "🛑 자료실 서비스 중지 중... (PID: $PID)"
        kill "$PID"
        sleep 2
        
        # 강제 종료 확인
        if ps -p "$PID" > /dev/null; then
            echo "⚡ 강제 종료 중..."
            kill -9 "$PID"
        fi
        
        rm -f "$PID_FILE"
        echo "✅ 자료실 서비스 중지 완료"
    else
        echo "⚠️ 프로세스가 이미 종료됨"
        rm -f "$PID_FILE"
    fi
else
    echo "⚠️ PID 파일이 없습니다. 수동으로 프로세스를 확인하세요."
    echo "실행 중인 Node.js 프로세스:"
    ps aux | grep 'node.*server.js' | grep -v grep
fi
EOF

# 실행 권한 부여
chmod +x stop-jaryo.sh
```

### 8단계: 서비스 시작 🎬

```bash
# 서비스 시작
./start-jaryo.sh

# 로그 확인 (별도 터미널에서)
tail -f jaryo.log
```

### 9단계: 접속 테스트 🧪

**브라우저에서 접속:**
- **메인 페이지**: `http://119.64.1.86:3005`
- **관리자 페이지**: `http://119.64.1.86:3005/admin`

**명령줄에서 테스트:**
```bash
# 서비스 상태 확인
curl -s http://119.64.1.86:3005

# 프로세스 확인
ps aux | grep 'node.*server.js' | grep -v grep

# 포트 확인
netstat -tulpn | grep :3005
```

## 🔧 서비스 관리

### 일상적인 관리 명령어

```bash
# 서비스 시작
/volume1/web/jaryo/start-jaryo.sh

# 서비스 중지
/volume1/web/jaryo/stop-jaryo.sh

# 서비스 재시작
/volume1/web/jaryo/stop-jaryo.sh && /volume1/web/jaryo/start-jaryo.sh

# 로그 확인
tail -f /volume1/web/jaryo/jaryo.log

# 실시간 로그 보기
ssh -p 2222 admin@119.64.1.86 'tail -f /volume1/web/jaryo/jaryo.log'
```

### 상태 모니터링

```bash
# 서비스 상태 스크립트
cat > status-jaryo.sh << 'EOF'
#!/bin/bash

PROJECT_DIR="/volume1/web/jaryo"
PID_FILE="$PROJECT_DIR/jaryo.pid"
LOG_FILE="$PROJECT_DIR/jaryo.log"

echo "=== 자료실 서비스 상태 ==="

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null; then
        echo "✅ 서비스 실행 중 (PID: $PID)"
        echo "📊 메모리 사용량:"
        ps -o pid,ppid,cmd,%mem,%cpu -p "$PID"
        echo ""
        echo "🌐 포트 상태:"
        netstat -tulpn | grep :3005
    else
        echo "❌ 서비스 중지됨 (PID 파일 존재하지만 프로세스 없음)"
    fi
else
    echo "❌ 서비스 중지됨 (PID 파일 없음)"
fi

echo ""
echo "📄 최근 로그 (최근 5줄):"
if [ -f "$LOG_FILE" ]; then
    tail -5 "$LOG_FILE"
else
    echo "로그 파일이 없습니다."
fi
EOF

chmod +x status-jaryo.sh
```

## 🔄 자동 시작 설정 (선택사항)

### DSM 작업 스케줄러 사용

1. **DSM 로그인** → **제어판** → **작업 스케줄러**
2. **생성** → **예약된 작업** → **사용자 정의 스크립트**
3. 설정:
   - **작업 이름**: Jaryo 자료실 자동 시작
   - **사용자**: root
   - **스케줄**: 시스템 부팅 시
   - **스크립트**: `/volume1/web/jaryo/start-jaryo.sh`

## 🚨 문제 해결

### 일반적인 문제들

**1. 포트 충돌**
```bash
# 포트 사용 확인
netstat -tulpn | grep :3005

# 다른 포트 사용시 (예: 3006)
PORT=3006 node server.js
```

**2. 권한 문제**
```bash
# 디렉토리 권한 수정
sudo chown -R admin:users /volume1/web/jaryo
chmod -R 755 /volume1/web/jaryo
```

**3. Node.js 버전 문제**
```bash
# Node.js 버전 확인
node --version

# 최소 요구 버전: v16.0.0
```

**4. 데이터베이스 문제**
```bash
# 데이터베이스 재초기화
rm -f jaryo.db
npm run init-db
```

## 📱 최종 확인

배포 완료 후 다음 URL들이 정상 작동하는지 확인:

- ✅ **메인 페이지**: http://119.64.1.86:3005
- ✅ **관리자 페이지**: http://119.64.1.86:3005/admin
- ✅ **API 상태**: http://119.64.1.86:3005/api/files
- ✅ **Gitea 저장소**: http://119.64.1.86:3000/vibsin9322/jaryo

## 🎉 배포 완료!

시놀로지 NAS에서 자료실 서비스가 성공적으로 실행되고 있습니다.
서비스 관리는 위의 스크립트들을 사용하여 쉽게 할 수 있습니다.