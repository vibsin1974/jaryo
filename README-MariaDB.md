# Jaryo File Manager - MariaDB 배포 가이드

## 개요
Jaryo File Manager를 시놀로지 NAS의 MariaDB와 함께 배포하는 가이드입니다.

## 시스템 요구사항

### NAS 환경
- 시놀로지 DSM 7.0+
- Node.js 18+ (DSM 패키지 센터에서 설치)
- MariaDB 10+ (DSM 패키지 센터에서 설치)
- Git Server (DSM 패키지 센터에서 설치)

### 개발 환경
- Node.js 18+
- MariaDB/MySQL 5.7+
- Git

## NAS 배포 단계

### 1. 빠른 배포 (권장)
```bash
# 자동 배포 스크립트 실행
./deploy-to-nas.sh [NAS-IP] jaryo [PASSWORD]

# 예시:
./deploy-to-nas.sh 192.168.1.100 jaryo mypassword
```

### 2. 수동 배포

#### 2.1 MariaDB 설정
NAS SSH 접속 후:
```sql
mysql -u root -p

CREATE DATABASE IF NOT EXISTS jaryo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'jaryo_user'@'localhost' IDENTIFIED BY 'JaryoPass2024!@#';
GRANT ALL PRIVILEGES ON jaryo.* TO 'jaryo_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 2.2 스키마 설정
```bash
mysql -u jaryo_user -p jaryo < database/mariadb-schema.sql
```

#### 2.3 서비스 배포
```bash
# 소스 코드 클론
cd /volume1/web
git clone [GITEA_URL] jaryo
cd jaryo

# 의존성 설치
npm install

# 데이터베이스 초기화
npm run init-mariadb

# 서비스 시작
./start-service.sh
```

## 환경별 설정

### Windows 개발 환경
`.env` 파일 생성:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=jaryo
HOST=0.0.0.0
PORT=3000
```

### NAS 운영 환경
환경 변수는 자동으로 설정됩니다:
- `NODE_ENV=production`
- `DEPLOY_ENV=nas`
- Unix Socket 연결: `/run/mysqld/mysqld10.sock`

## 관리 명령어

### 서비스 관리
```bash
# 시작
./start-service.sh

# 중지
kill $(cat jaryo-nas.pid)

# 로그 확인
tail -f logs/app.log
```

### 데이터베이스 관리
```bash
# 초기화
npm run init-mariadb

# 직접 연결
mysql -u jaryo_user -p -S /run/mysqld/mysqld10.sock jaryo
```

## 접속 정보

### 기본 관리자 계정
- **이메일**: admin@jaryo.com
- **비밀번호**: Hee150603!

### 서비스 URL
- **메인**: http://[NAS-IP]:3005
- **관리자**: http://[NAS-IP]:3005/admin

## 문제 해결

### 연결 오류
1. MariaDB 서비스 상태 확인
2. 데이터베이스 및 사용자 권한 확인
3. 소켓 파일 경로 확인
4. 방화벽 설정 확인

### 상세 가이드
더 자세한 설정 방법은 `mariadb-setup.md` 파일을 참조하세요.

## 기술 스택
- **Backend**: Node.js + Express
- **Database**: MariaDB
- **Frontend**: Vanilla JavaScript
- **Deployment**: Shell Scripts

## 지원
- 로그 파일: `/volume1/web/jaryo/logs/app.log`
- 설정 파일: `database/mariadb-helper.js`
- 스키마: `database/mariadb-schema.sql`