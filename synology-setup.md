# 시놀로지 NAS에서 Jaryo File Manager 서비스 실행 가이드

## 1. 사전 준비사항

### 1.1 DSM 패키지 설치
1. **DSM 제어판** → **패키지 센터** 접속
2. 다음 패키지들을 설치:
   - **Node.js** (최신 LTS 버전 권장)
   - **Git Server** (선택사항, 소스코드 관리용)
   - **Web Station** (선택사항, 웹 서버 프록시용)

### 1.2 SSH 활성화
1. **DSM 제어판** → **터미널 및 SNMP** → **SSH 서비스 활성화**
2. 포트 번호 확인 (기본: 22)

## 2. 프로젝트 배포

### 2.1 방법 1: 직접 파일 업로드 (간단한 방법)

1. **File Station**에서 `/volume1/web/` 폴더 생성
2. 프로젝트 파일들을 `jaryo` 폴더에 업로드
3. SSH로 접속하여 설정

### 2.2 방법 2: Git을 통한 배포 (권장)

```bash
# NAS에 SSH 접속
ssh admin@your-nas-ip

# 프로젝트 디렉토리 생성
mkdir -p /volume1/web/jaryo
cd /volume1/web/jaryo

# Git 저장소 클론 (로컬에서 push한 경우)
git clone [your-repository-url] .

# 또는 로컬에서 직접 파일 복사
# scp -r ./jaryo/* admin@your-nas-ip:/volume1/web/jaryo/
```

## 3. 서비스 설정 및 실행

### 3.1 스크립트 권한 설정

```bash
# SSH로 NAS 접속
ssh admin@your-nas-ip

# 프로젝트 디렉토리로 이동
cd /volume1/web/jaryo

# 스크립트 실행 권한 부여
chmod +x start-service.sh
chmod +x stop-service.sh
```

### 3.2 서비스 시작

```bash
# 서비스 시작
./start-service.sh

# 로그 확인
tail -f logs/app.log

# 프로세스 상태 확인
ps aux | grep "node server.js"
```

### 3.3 서비스 중지

```bash
# 서비스 중지
./stop-service.sh
```

## 4. 자동 시작 설정 (선택사항)

### 4.1 Task Scheduler 사용

1. **DSM 제어판** → **작업 스케줄러**
2. **작업 생성** → **사용자 정의 스크립트**
3. 설정:
   - **작업 이름**: Jaryo Service Start
   - **사용자**: root
   - **스케줄**: 시스템 부팅 시
   - **작업 설정**: `/volume1/web/jaryo/start-service.sh`

### 4.2 rc.local 사용 (고급 사용자)

```bash
# /etc/rc.local 파일 편집
sudo vi /etc/rc.local

# 다음 라인 추가
/volume1/web/jaryo/start-service.sh &

# 파일 저장 후 권한 설정
chmod +x /etc/rc.local
```

## 5. 방화벽 및 포트 설정

### 5.1 DSM 방화벽 설정

1. **DSM 제어판** → **보안** → **방화벽**
2. **방화벽 규칙 편집** → **규칙 생성**
3. 설정:
   - **포트**: 3005 (애플리케이션 포트)
   - **프로토콜**: TCP
   - **소스**: 허용할 IP 범위

### 5.2 라우터 포트 포워딩 (외부 접속용)

라우터에서 포트 3005를 NAS의 IP로 포워딩 설정

## 6. 웹 서버 프록시 설정 (Web Station 사용)

### 6.1 Web Station 설정

1. **Web Station** → **가상 호스트** → **생성**
2. 설정:
   - **도메인 이름**: your-domain.com (또는 IP)
   - **포트**: 80 (또는 443 for HTTPS)
   - **문서 루트**: `/volume1/web/jaryo`
   - **HTTP 백엔드 서버**: `http://localhost:3005`

### 6.2 Apache 설정 (고급)

```apache
# /volume1/web/apache/conf/vhost/VirtualHost.conf
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /volume1/web/jaryo
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:3005/
    ProxyPassReverse / http://localhost:3005/
    
    <Directory /volume1/web/jaryo>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

## 7. 모니터링 및 유지보수

### 7.1 로그 모니터링

```bash
# 실시간 로그 확인
tail -f /volume1/web/jaryo/logs/app.log

# 로그 파일 크기 확인
du -h /volume1/web/jaryo/logs/app.log

# 로그 로테이션 설정 (logrotate 사용)
```

### 7.2 서비스 상태 확인

```bash
# 프로세스 확인
ps aux | grep "node server.js"

# 포트 사용 확인
netstat -tlnp | grep :3005

# 메모리 사용량 확인
top -p $(cat /volume1/web/jaryo/app.pid)
```

### 7.3 백업 설정

1. **Hyper Backup** 패키지 설치
2. `/volume1/web/jaryo` 폴더 백업 스케줄 설정
3. 데이터베이스 파일 (`jaryo.db`) 별도 백업 권장

## 8. 문제 해결

### 8.1 일반적인 문제들

**서비스가 시작되지 않는 경우:**
```bash
# Node.js 설치 확인
which node
node --version

# 의존성 재설치
cd /volume1/web/jaryo
rm -rf node_modules package-lock.json
npm install

# 권한 문제 확인
ls -la /volume1/web/jaryo/
chown -R admin:users /volume1/web/jaryo/
```

**포트 충돌 문제:**
```bash
# 포트 사용 확인
netstat -tlnp | grep :3005

# 다른 포트로 변경 (server.js 수정)
# const PORT = process.env.PORT || 3006;
```

**메모리 부족 문제:**
```bash
# 메모리 사용량 확인
free -h

# Node.js 메모리 제한 설정
# node --max-old-space-size=512 server.js
```

### 8.2 로그 분석

```bash
# 에러 로그만 확인
grep -i error /volume1/web/jaryo/logs/app.log

# 최근 100줄 확인
tail -100 /volume1/web/jaryo/logs/app.log

# 특정 시간대 로그 확인
grep "2024-01-15" /volume1/web/jaryo/logs/app.log
```

## 9. 보안 고려사항

1. **HTTPS 설정**: Let's Encrypt 인증서 사용
2. **방화벽 강화**: 필요한 포트만 개방
3. **정기 업데이트**: Node.js 및 패키지 업데이트
4. **백업**: 정기적인 데이터 백업
5. **모니터링**: 로그 모니터링 및 알림 설정

## 10. 성능 최적화

1. **PM2 사용**: 프로세스 관리자로 PM2 사용 고려
2. **캐싱**: 정적 파일 캐싱 설정
3. **압축**: gzip 압축 활성화
4. **CDN**: 정적 파일 CDN 사용 고려

---

**참고**: 이 가이드는 시놀로지 DSM 7.x 기준으로 작성되었습니다. 버전에 따라 일부 설정이 다를 수 있습니다.
