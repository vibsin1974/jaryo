-- 자료실 SQLite 데이터베이스 스키마
-- 파일: database/schema.sql

-- 파일 정보 테이블
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT '기타',
    tags TEXT, -- JSON 배열로 저장
    user_id TEXT DEFAULT 'offline-user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 파일 첨부 정보 테이블
CREATE TABLE IF NOT EXISTS file_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_name TEXT NOT NULL, -- 실제 저장된 파일명
    file_path TEXT NOT NULL, -- 파일 저장 경로
    file_size INTEGER DEFAULT 0,
    mime_type TEXT,
    file_data TEXT, -- base64 인코딩된 파일 데이터 (소용량 파일용)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- 카테고리 테이블
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    is_default INTEGER DEFAULT 0, -- 기본 카테고리 여부
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user', -- 'admin', 'user'
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- 세션 테이블
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 기본 카테고리 데이터 삽입
INSERT OR IGNORE INTO categories (name, is_default) VALUES 
('문서', 1),
('이미지', 1),
('동영상', 1),
('프레젠테이션', 1),
('기타', 1);

-- 기본 관리자 계정 생성 (비밀번호: admin123)
INSERT OR IGNORE INTO users (id, email, password_hash, name, role) VALUES 
('admin-001', 'admin@jaryo.com', '$2b$10$0u/zxn1NL4n6t.hNs1eMh.12tXEv9HYgf4cPRXKT3aX97mOKR01Du', '관리자', 'admin');

-- 샘플 데이터 삽입
INSERT OR IGNORE INTO files (id, title, description, category, tags, created_at, updated_at) VALUES 
('sample-1', '프로젝트 계획서', '2024년 상반기 주요 프로젝트 계획서입니다.', '문서', '["계획서", "프로젝트", "2024"]', datetime('now'), datetime('now')),
('sample-2', '회의 자료', '월간 정기 회의 자료 모음입니다.', '프레젠테이션', '["회의", "정기회의"]', datetime('now'), datetime('now')),
('sample-3', '시스템 스크린샷', '새로운 관리 시스템 화면 캡처 이미지들입니다.', '이미지', '["시스템", "스크린샷"]', datetime('now'), datetime('now'));

-- 샘플 첨부파일 데이터
INSERT OR IGNORE INTO file_attachments (file_id, original_name, file_name, file_path, file_size, mime_type) VALUES 
('sample-1', 'project_plan_2024.pdf', 'project_plan_2024.pdf', 'uploads/project_plan_2024.pdf', 1024000, 'application/pdf'),
('sample-2', 'meeting_slides.pptx', 'meeting_slides.pptx', 'uploads/meeting_slides.pptx', 2048000, 'application/vnd.openxmlformats-officedocument.presentationml.presentation'),
('sample-3', 'admin_screenshot1.png', 'admin_screenshot1.png', 'uploads/admin_screenshot1.png', 512000, 'image/png'),
('sample-3', 'admin_screenshot2.png', 'admin_screenshot2.png', 'uploads/admin_screenshot2.png', 768000, 'image/png');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_file_id ON file_attachments(file_id);

