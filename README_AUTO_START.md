# Jaryo File Manager 자동 시작 설정 가이드

## 🚀 자동 시작 설정 방법

### 방법 1: 배치 파일 실행 (권장)

1. **관리자 권한으로 실행**
   - `install-auto-startup.bat` 파일을 마우스 우클릭
   - "관리자 권한으로 실행" 선택
   - 안내에 따라 진행

2. **설정 완료 후**
   - 컴퓨터 재시작 시 자동으로 서비스 시작
   - 서비스 URL: http://99.1.110.50:3005

### 방법 2: 수동 작업 스케줄러 설정

1. **작업 스케줄러 열기**
   - Windows 키 + R → `taskschd.msc` 입력 → 엔터

2. **기본 작업 만들기**
   - 오른쪽 패널에서 "기본 작업 만들기" 클릭
   - 이름: `JaryoFileManagerAutoStart`
   - 설명: `Jaryo File Manager 자동 시작`

3. **트리거 설정**
   - "컴퓨터를 시작할 때" 선택

4. **동작 설정**
   - "프로그램 시작" 선택
   - 프로그램/스크립트: `C:\Users\COMTREE\claude_code\jaryo\start-jaryo-service.bat`
   - 시작 위치: `C:\Users\COMTREE\claude_code\jaryo`

5. **고급 설정**
   - "가장 높은 권한으로 실행" 체크
   - "작업이 이미 실행 중인 경우 규칙": "새 인스턴스 시작 안 함"

## 🔧 서비스 관리 명령어

### 수동 서비스 제어
```batch
# 서비스 시작
start-jaryo-service.bat

# 서비스 중지
stop-jaryo-service.bat
```

### 자동 시작 관리
```batch
# 자동 시작 설정
install-auto-startup.bat (관리자 권한 필요)

# 자동 시작 해제
uninstall-auto-startup.bat (관리자 권한 필요)
```

### 작업 스케줄러 명령어
```cmd
# 작업 상태 확인
schtasks /query /tn "JaryoFileManagerAutoStart"

# 작업 수동 실행
schtasks /run /tn "JaryoFileManagerAutoStart"

# 작업 삭제
schtasks /delete /tn "JaryoFileManagerAutoStart" /f
```

## 🌐 접속 정보

- **관리자 페이지**: http://99.1.110.50:3005/admin/index.html
- **메인 페이지**: http://99.1.110.50:3005/index.html
- **API**: http://99.1.110.50:3005/api/files
- **상태 확인**: http://99.1.110.50:3005/health

## 📁 로그 확인

- **로그 파일**: `C:\Users\COMTREE\claude_code\jaryo\logs\app.log`
- **로그 보기**: `type "C:\Users\COMTREE\claude_code\jaryo\logs\app.log"`

## ⚠️ 문제 해결

### 서비스가 시작되지 않는 경우
1. Node.js가 설치되어 있는지 확인: `node --version`
2. 프로젝트 디렉토리가 올바른지 확인
3. 포트 3005가 사용 중인지 확인: `netstat -an | findstr :3005`
4. 로그 파일 확인

### 자동 시작이 작동하지 않는 경우
1. 작업 스케줄러에서 작업 상태 확인
2. 관리자 권한으로 설정했는지 확인
3. 배치 파일 경로가 올바른지 확인

## 📞 지원

문제가 발생하면 다음을 확인해주세요:
1. 로그 파일 내용
2. 작업 스케줄러 작업 상태
3. 포트 사용 현황
4. Node.js 설치 상태