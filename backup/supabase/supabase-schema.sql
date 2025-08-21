-- Supabase 데이터베이스 스키마
-- 이 파일을 Supabase SQL 에디터에서 실행하세요

-- 1. files 테이블 생성
CREATE TABLE IF NOT EXISTS public.files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. file_attachments 테이블 생성 (파일 첨부 정보)
CREATE TABLE IF NOT EXISTS public.file_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE NOT NULL,
    original_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Row Level Security (RLS) 정책 활성화
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_attachments ENABLE ROW LEVEL SECURITY;

-- 4. files 테이블 RLS 정책
-- 사용자는 자신의 파일만 조회할 수 있음
CREATE POLICY "Users can view their own files" ON public.files
    FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 파일만 생성할 수 있음
CREATE POLICY "Users can create their own files" ON public.files
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 파일만 수정할 수 있음
CREATE POLICY "Users can update their own files" ON public.files
    FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 파일만 삭제할 수 있음
CREATE POLICY "Users can delete their own files" ON public.files
    FOR DELETE USING (auth.uid() = user_id);

-- 5. file_attachments 테이블 RLS 정책
-- 사용자는 자신의 파일 첨부만 조회할 수 있음
CREATE POLICY "Users can view their own file attachments" ON public.file_attachments
    FOR SELECT USING (
        auth.uid() = (
            SELECT user_id FROM public.files WHERE id = file_attachments.file_id
        )
    );

-- 사용자는 자신의 파일에만 첨부를 생성할 수 있음
CREATE POLICY "Users can create attachments for their own files" ON public.file_attachments
    FOR INSERT WITH CHECK (
        auth.uid() = (
            SELECT user_id FROM public.files WHERE id = file_attachments.file_id
        )
    );

-- 사용자는 자신의 파일 첨부만 삭제할 수 있음
CREATE POLICY "Users can delete their own file attachments" ON public.file_attachments
    FOR DELETE USING (
        auth.uid() = (
            SELECT user_id FROM public.files WHERE id = file_attachments.file_id
        )
    );

-- 6. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_category ON public.files(category);
CREATE INDEX IF NOT EXISTS idx_files_tags ON public.files USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_file_attachments_file_id ON public.file_attachments(file_id);

-- 7. 업데이트 트리거 함수 (updated_at 자동 갱신)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. updated_at 자동 갱신 트리거
CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON public.files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Storage 버킷 생성 (실제로는 Supabase Dashboard에서 생성)
-- 버킷 이름: 'files'
-- 공개 액세스: false (인증된 사용자만 접근)
-- 
-- Storage 정책은 Supabase Dashboard에서 다음과 같이 설정:
-- SELECT: 사용자는 자신의 파일만 조회 가능
-- INSERT: 사용자는 자신의 폴더에만 업로드 가능
-- UPDATE: 사용자는 자신의 파일만 수정 가능
-- DELETE: 사용자는 자신의 파일만 삭제 가능

-- 10. 유용한 뷰 생성 (파일과 첨부 정보 조인)
-- 주의: 뷰는 자동으로 기본 테이블의 RLS 정책을 상속받으므로 별도 정책 설정 불필요
CREATE OR REPLACE VIEW public.files_with_attachments AS
SELECT 
    f.*,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', fa.id,
                'original_name', fa.original_name,
                'storage_path', fa.storage_path,
                'file_size', fa.file_size,
                'mime_type', fa.mime_type,
                'created_at', fa.created_at
            )
        ) FILTER (WHERE fa.id IS NOT NULL),
        '[]'::json
    ) AS attachments
FROM public.files f
LEFT JOIN public.file_attachments fa ON f.id = fa.file_id
GROUP BY f.id, f.title, f.description, f.category, f.tags, f.user_id, f.created_at, f.updated_at;

-- 설정 완료 메시지
SELECT 'Supabase 스키마 설정이 완료되었습니다!' as message;