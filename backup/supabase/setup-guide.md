# Supabase 설정 가이드

이 문서는 자료실 시스템을 Supabase와 연동하기 위한 설정 가이드입니다.

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 접속하여 계정을 생성합니다.
2. 새 프로젝트를 생성합니다.
3. 프로젝트 이름과 비밀번호를 설정합니다.
4. 리전은 `ap-northeast-1` (Asia Pacific - Tokyo)를 선택하는 것을 권장합니다.

## 2. 데이터베이스 스키마 설정

1. Supabase 대시보드에서 **SQL Editor**로 이동합니다.
2. `supabase-schema.sql` 파일의 내용을 복사하여 실행합니다.
3. 스키마가 성공적으로 생성되었는지 **Table Editor**에서 확인합니다.

### 생성되는 테이블
- `files`: 파일 메타데이터 저장
- `file_attachments`: 첨부파일 정보 저장

## 3. Storage 버킷 설정

1. Supabase 대시보드에서 **Storage**로 이동합니다.
2. **New bucket** 버튼을 클릭합니다.
3. 버킷 이름을 `files`로 설정합니다.
4. **Public bucket** 체크박스는 해제합니다 (보안상 권장).
5. 버킷을 생성합니다.

### Storage 정책 설정
버킷 생성 후 **Policies** 탭에서 다음 정책들을 추가합니다:

#### SELECT 정책 (파일 조회)
```sql
CREATE POLICY "Users can view their own files" ON storage.objects 
FOR SELECT USING (
    bucket_id = 'files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);
```

#### INSERT 정책 (파일 업로드)
```sql
CREATE POLICY "Users can upload their own files" ON storage.objects 
FOR INSERT WITH CHECK (
    bucket_id = 'files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);
```

#### DELETE 정책 (파일 삭제)
```sql
CREATE POLICY "Users can delete their own files" ON storage.objects 
FOR DELETE USING (
    bucket_id = 'files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);
```

## 4. API 키 및 URL 설정

1. Supabase 대시보드에서 **Settings** > **API**로 이동합니다.
2. 다음 정보를 확인합니다:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Project API keys** > **anon public**: `eyJ...`

3. `supabase-config.js` 파일을 수정합니다:
```javascript
const SUPABASE_CONFIG = {
    url: 'https://your-project-id.supabase.co',  // 실제 Project URL로 교체
    anonKey: 'eyJ...'  // 실제 anon public key로 교체
};
```

## 5. 인증 설정 (선택사항)

### 이메일 인증 비활성화 (개발용)
개발 환경에서 빠른 테스트를 위해 이메일 인증을 비활성화할 수 있습니다:

1. **Authentication** > **Settings**로 이동
2. **Enable email confirmations** 체크박스 해제
3. **Save** 클릭

⚠️ **주의**: 프로덕션 환경에서는 이메일 인증을 활성화하는 것을 강력히 권장합니다.

### 이메일 템플릿 설정 (프로덕션용)
1. **Authentication** > **Email Templates**에서 이메일 템플릿을 커스터마이징할 수 있습니다.
2. 회사 브랜드에 맞게 이메일 디자인을 수정하세요.

## 6. 보안 설정

### Row Level Security (RLS)
스키마 실행 시 자동으로 설정되지만, 다음 사항을 확인하세요:

1. **Authentication** > **Policies**에서 정책이 올바르게 설정되었는지 확인
2. 각 테이블에 사용자별 접근 제한이 적용되어 있는지 확인

### 환경변수 보안
프로덕션 환경에서는 API 키를 환경변수로 관리하세요:

```javascript
const SUPABASE_CONFIG = {
    url: process.env.SUPABASE_URL || 'YOUR_SUPABASE_PROJECT_URL',
    anonKey: process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'
};
```

## 7. 테스트

설정 완료 후 다음 기능들을 테스트하세요:

1. **회원가입/로그인** - 새 계정 생성 및 로그인
2. **파일 추가** - 새 자료 추가 (첨부파일 포함)
3. **파일 수정** - 기존 자료 수정
4. **파일 삭제** - 자료 삭제 (첨부파일도 함께 삭제되는지 확인)
5. **파일 다운로드** - 첨부파일 다운로드
6. **실시간 동기화** - 다른 브라우저에서 같은 계정으로 로그인하여 실시간 동기화 확인

## 8. 문제 해결

### 연결 오류
- Supabase URL과 API 키가 올바른지 확인
- 브라우저 콘솔에서 오류 메시지 확인
- CORS 설정 확인 (대부분 자동으로 설정됨)

### 권한 오류
- RLS 정책이 올바르게 설정되었는지 확인
- 사용자가 올바르게 인증되었는지 확인

### 파일 업로드 오류
- Storage 버킷이 올바르게 생성되었는지 확인
- Storage 정책이 올바르게 설정되었는지 확인
- 파일 크기 제한 확인 (Supabase 기본값: 50MB)

## 9. 추가 개선사항

### 성능 최적화
- 대용량 파일 처리를 위한 chunk 업로드 구현
- 이미지 최적화 및 썸네일 생성
- CDN 연동 고려

### 기능 확장
- 파일 공유 기능
- 버전 관리
- 협업 기능
- 백업 및 복원 기능

---

설정 중 문제가 발생하면 [Supabase 공식 문서](https://supabase.com/docs)를 참고하거나 이슈를 등록해주세요.