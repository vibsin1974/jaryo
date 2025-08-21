-- Storage 전용 정책 (Supabase Dashboard → Storage → Policies에서 실행)

-- 1. 파일 업로드 정책
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT 
WITH CHECK (
    bucket_id = 'files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- 2. 파일 조회 정책
CREATE POLICY "Users can view own files"
ON storage.objects
FOR SELECT 
USING (
    bucket_id = 'files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. 파일 업데이트 정책
CREATE POLICY "Users can update own files"
ON storage.objects
FOR UPDATE 
USING (
    bucket_id = 'files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. 파일 삭제 정책
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE 
USING (
    bucket_id = 'files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- 참고: storage.foldername(name)[1]은 'user_id/filename.txt'에서 'user_id' 부분을 추출합니다.