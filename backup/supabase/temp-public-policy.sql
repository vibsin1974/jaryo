-- 임시 공개 접근 정책 (테스트용만 사용!)
-- 보안상 권장하지 않음 - 운영환경에서는 사용하지 마세요

-- 모든 사용자가 files 버킷에 업로드 가능 (임시)
CREATE POLICY "Public upload for testing"
ON storage.objects
FOR INSERT 
WITH CHECK (bucket_id = 'files');

-- 모든 사용자가 files 버킷 파일 조회 가능 (임시)
CREATE POLICY "Public read for testing"
ON storage.objects
FOR SELECT 
USING (bucket_id = 'files');

-- 주의: 이 정책들은 테스트 후 반드시 삭제하고 위의 사용자별 정책으로 교체하세요!