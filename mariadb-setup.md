# 시놀로지 NAS MariaDB 설정 가이드

## 1. MariaDB 패키지 설치

1. **DSM 패키지 센터** 열기
2. **MariaDB 10** 검색 및 설치
3. 설치 완료 후 **실행**

## 2. MariaDB 초기 설정

### 2.1 MariaDB 관리 도구 접속
- DSM에서 **MariaDB 10** 앱 실행
- 또는 웹 브라우저에서 `http://NAS-IP:3307` 접속

### 2.2 관리자 계정으로 로그인
- 사용자: `root`
- 비밀번호: 설치 시 설정한 비밀번호

## 3. 자료실 데이터베이스 설정

### 3.1 데이터베이스 생성
```sql
CREATE DATABASE IF NOT EXISTS jaryo 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
```

### 3.2 전용 사용자 생성
```sql
CREATE USER 'jaryo_user'@'localhost' IDENTIFIED BY 'JaryoPass2024!@#';
GRANT ALL PRIVILEGES ON jaryo.* TO 'jaryo_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3.3 테이블 생성 (스키마 적용)
```bash
# NAS SSH 접속 후
cd /volume1/web/jaryo
mysql -u jaryo_user -p jaryo < database/mariadb-schema.sql
```

## 4. 연결 설정 확인

### 4.1 Unix Socket 경로 확인
```bash
sudo find /run -name "*.sock" | grep mysql
# 일반적인 경로: /run/mysqld/mysqld10.sock
```

### 4.2 연결 테스트
```bash
mysql -u jaryo_user -p -S /run/mysqld/mysqld10.sock jaryo
```

## 5. NAS 자료실 서비스 배포

### 5.1 자동 배포
```bash
./deploy-to-nas.sh [NAS-IP] jaryo [PASSWORD]
```

### 5.2 수동 초기화 (필요시)
```bash
cd /volume1/web/jaryo
npm run init-mariadb
```

## 6. 문제 해결

### 6.1 연결 오류
- MariaDB 서비스 상태 확인: `sudo systemctl status mariadb`
- 소켓 파일 권한 확인: `ls -la /run/mysqld/`
- 방화벽 설정 확인

### 6.2 권한 오류
```sql
-- 권한 재설정
GRANT ALL PRIVILEGES ON jaryo.* TO 'jaryo_user'@'localhost';
FLUSH PRIVILEGES;
```

### 6.3 한글 데이터 문제
```sql
-- 문자셋 확인
SHOW VARIABLES LIKE 'character_set%';
SHOW VARIABLES LIKE 'collation%';
```

## 7. 성능 최적화

### 7.1 인덱스 확인
```sql
USE jaryo;
SHOW INDEX FROM files;
SHOW INDEX FROM file_attachments;
```

### 7.2 쿼리 최적화
```sql
-- 슬로우 쿼리 로그 활성화
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
```

## 8. 백업 및 복원

### 8.1 데이터베이스 백업
```bash
mysqldump -u jaryo_user -p jaryo > jaryo_backup_$(date +%Y%m%d).sql
```

### 8.2 데이터베이스 복원
```bash
mysql -u jaryo_user -p jaryo < jaryo_backup_YYYYMMDD.sql
```

## 9. 보안 설정

### 9.1 비밀번호 변경
```sql
ALTER USER 'jaryo_user'@'localhost' IDENTIFIED BY 'NEW_SECURE_PASSWORD';
```

### 9.2 불필요한 권한 제거
```sql
-- 테스트 데이터베이스 제거
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.user WHERE User='';
FLUSH PRIVILEGES;
```