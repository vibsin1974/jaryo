-- 완전 초기화 후 Storage 정책 재설정

-- 1단계: 모든 기존 Storage 정책 삭제
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Public upload for testing" ON storage.objects;
DROP POLICY IF EXISTS "Public read for testing" ON storage.objects;

-- 혹시 다른 이름으로 생성된 정책들도 삭제
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON storage.objects;

-- 2단계: RLS 활성화 확인 (보통 이미 활성화되어 있음)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3단계: 새 정책 생성
-- 업로드 정책
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT 
WITH CHECK (
    bucket_id = 'files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- 조회 정책
CREATE POLICY "Users can view own files"
ON storage.objects
FOR SELECT 
USING (
    bucket_id = 'files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- 업데이트 정책
CREATE POLICY "Users can update own files"
ON storage.objects
FOR UPDATE 
USING (
    bucket_id = 'files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- 삭제 정책
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE 
USING (
    bucket_id = 'files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- 4단계: 정책 생성 확인
SELECT 
    'Storage policies created successfully!' as message,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';