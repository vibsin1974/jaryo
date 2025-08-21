const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const DatabaseHelper = require('./database/db-helper');

const app = express();
const PORT = process.env.PORT || 3005;

// 데이터베이스 헬퍼 인스턴스
const db = new DatabaseHelper();

// 미들웨어 설정
app.use(cors({
    origin: true, // 모든 도메인 허용 (Vercel 배포용)
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 세션 설정
app.use(session({
    secret: 'jaryo-file-manager-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Vercel에서는 HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24시간
    }
}));

// 모든 요청 로깅 미들웨어
app.use((req, res, next) => {
    if (req.url.includes('/api/categories')) {
        console.log(`📨 ${req.method} ${req.url} - Time: ${new Date().toISOString()}`);
        console.log('Headers:', req.headers);
        console.log('Body:', req.body);
    }
    next();
});

// CSS 파일에 대한 캐시 무효화 헤더 설정
app.get('*.css', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// 정적 파일 서빙
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 루트 경로에서 메인 페이지로 리다이렉트
app.get('/', (req, res) => {
    res.redirect('/index.html');
});

// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Jaryo File Manager is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Multer 설정 (파일 업로드)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // 한글 파일명 처리를 위해 Buffer로 디코딩
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(originalName);
        const baseName = path.basename(originalName, extension);
        
        // 안전한 파일명 생성 (특수문자 제거)
        const safeName = baseName.replace(/[<>:"/\\|?*]/g, '_');
        cb(null, safeName + '-' + uniqueSuffix + extension);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 * 1024, // 2GB 제한
        files: 20, // 최대 파일 개수
        fieldSize: 100 * 1024 * 1024 // 필드 크기 제한
    },
    fileFilter: (req, file, cb) => {
        // 모든 파일 타입 허용
        cb(null, true);
    }
});

// 인증 미들웨어
const requireAuth = async (req, res, next) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                success: false,
                error: '로그인이 필요합니다.'
            });
        }
        
        const user = await db.getUserById(req.session.userId);
        if (!user) {
            req.session.destroy();
            return res.status(401).json({
                success: false,
                error: '유효하지 않은 세션입니다.'
            });
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('인증 미들웨어 오류:', error);
        res.status(500).json({
            success: false,
            error: '인증 처리 중 오류가 발생했습니다.'
        });
    }
};

// 관리자 권한 확인 미들웨어
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: '관리자 권한이 필요합니다.'
        });
    }
    next();
};

// API 라우트

// 회원가입
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: '이메일, 비밀번호, 이름은 필수입니다.'
            });
        }
        
        // 이메일 중복 확인
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: '이미 등록된 이메일입니다.'
            });
        }
        
        // 비밀번호 해시화
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);
        
        // 사용자 생성
        const result = await db.createUser({
            email,
            password_hash,
            name,
            role: 'user'
        });
        
        res.json({
            success: true,
            message: '회원가입이 완료되었습니다.',
            data: { id: result.id }
        });
    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).json({
            success: false,
            error: '회원가입 중 오류가 발생했습니다.'
        });
    }
});

// 로그인
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: '이메일과 비밀번호를 입력해주세요.'
            });
        }
        
        // 사용자 확인
        const user = await db.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: '이메일 또는 비밀번호가 올바르지 않습니다.'
            });
        }
        
        // 비밀번호 확인
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: '이메일 또는 비밀번호가 올바르지 않습니다.'
            });
        }
        
        // 세션 설정
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.userName = user.name;
        req.session.userRole = user.role;
        
        // 마지막 로그인 시간 업데이트
        await db.updateUserLastLogin(user.id);
        
        res.json({
            success: true,
            message: '로그인 성공',
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).json({
            success: false,
            error: '로그인 중 오류가 발생했습니다.'
        });
    }
});

// 로그아웃
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('로그아웃 오류:', err);
            return res.status(500).json({
                success: false,
                error: '로그아웃 중 오류가 발생했습니다.'
            });
        }
        
        res.json({
            success: true,
            message: '로그아웃되었습니다.'
        });
    });
});

// 현재 사용자 정보 조회
app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({
        success: true,
        data: {
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            role: req.user.role,
            last_login: req.user.last_login
        }
    });
});

// 세션 상태 확인
app.get('/api/auth/session', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.json({
                success: true,
                user: null
            });
        }
        
        const user = await db.getUserById(req.session.userId);
        if (!user) {
            req.session.destroy();
            return res.json({
                success: true,
                user: null
            });
        }
        
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                last_login: user.last_login
            }
        });
    } catch (error) {
        console.error('세션 확인 오류:', error);
        res.status(500).json({
            success: false,
            error: '세션 확인 중 오류가 발생했습니다.'
        });
    }
});

// 파일 목록 조회 (관리자용)
app.get('/api/files', async (req, res) => {
    try {
        const { search, category, limit = 100, offset = 0 } = req.query;
        
        let files;
        if (search) {
            files = await db.searchFiles(search, category, parseInt(limit));
        } else {
            files = await db.getAllFiles(parseInt(limit), parseInt(offset));
        }
        
        res.json({
            success: true,
            data: files,
            count: files.length
        });
    } catch (error) {
        console.error('파일 목록 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 공개 파일 목록 조회 (일반 사용자용)
app.get('/api/files/public', async (req, res) => {
    try {
        const { search, category, limit = 100, offset = 0 } = req.query;
        
        let files;
        if (search) {
            files = await db.searchFiles(search, category, parseInt(limit));
        } else {
            files = await db.getAllFiles(parseInt(limit), parseInt(offset));
        }
        
        res.json({
            success: true,
            data: files,
            count: files.length
        });
    } catch (error) {
        console.error('공개 파일 목록 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 파일 추가
app.post('/api/files', requireAuth, upload.array('files'), async (req, res) => {
    try {
        const { title, description, category, tags } = req.body;
        
        if (!title || !category) {
            return res.status(400).json({
                success: false,
                error: '제목과 카테고리는 필수입니다.'
            });
        }
        
        const fileId = db.generateId();
        const fileData = {
            id: fileId,
            title,
            description,
            category,
            tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
            user_id: req.user.id
        };
        
        // 파일 정보 저장
        const result = await db.addFile(fileData);
        
        // 첨부파일 처리
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                // 한글 파일명 처리
                const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                
                await db.addFileAttachment(fileId, {
                    original_name: originalName,
                    file_name: file.filename,
                    file_path: file.path,
                    file_size: file.size,
                    mime_type: file.mimetype
                });
            }
        }
        
        res.json({
            success: true,
            data: { id: fileId, ...result }
        });
    } catch (error) {
        console.error('파일 추가 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 파일 수정
app.put('/api/files/:id', requireAuth, upload.array('files'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category, tags, filesToDelete } = req.body;
        
        console.log('🔄 파일 업데이트 시작:', id);
        console.log('📋 업데이트 데이터:', { title, description, category, tags });
        console.log('🗑️ 삭제할 첨부파일:', filesToDelete);
        console.log('📎 새 첨부파일 개수:', req.files ? req.files.length : 0);
        
        // 기본 파일 정보 업데이트
        const updates = {
            title,
            description,
            category,
            tags: tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : '[]'
        };
        
        const result = await db.updateFile(id, updates);
        
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: '파일을 찾을 수 없습니다.'
            });
        }
        
        // 첨부파일 삭제 처리
        if (filesToDelete) {
            const deleteIds = typeof filesToDelete === 'string' ? JSON.parse(filesToDelete) : filesToDelete;
            console.log('삭제 처리할 첨부파일 ID들:', deleteIds);
            
            if (Array.isArray(deleteIds) && deleteIds.length > 0) {
                for (const attachmentId of deleteIds) {
                    try {
                        // 첨부파일 정보 조회
                        const attachments = await db.getFileAttachments(id);
                        const attachment = attachments.find(a => a.id == attachmentId);
                        
                        if (attachment) {
                            // 실제 파일 삭제
                            const filePath = path.join(__dirname, attachment.file_path);
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                                console.log('실제 파일 삭제됨:', filePath);
                            }
                            
                            // 데이터베이스에서 첨부파일 삭제
                            await db.deleteFileAttachment(attachmentId);
                            console.log('DB에서 첨부파일 삭제됨:', attachmentId);
                        }
                    } catch (deleteError) {
                        console.error('첨부파일 삭제 오류:', deleteError);
                    }
                }
            }
        }
        
        // 새 첨부파일 추가
        if (req.files && req.files.length > 0) {
            console.log('새 첨부파일 추가 시작');
            for (const file of req.files) {
                try {
                    // 한글 파일명 처리
                    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                    
                    await db.addFileAttachment(id, {
                        original_name: originalName,
                        file_name: file.filename,
                        file_path: file.path,
                        file_size: file.size,
                        mime_type: file.mimetype
                    });
                    
                    console.log('새 첨부파일 추가됨:', originalName);
                } catch (addError) {
                    console.error('새 첨부파일 추가 오류:', addError);
                }
            }
        }
        
        console.log('✅ 파일 업데이트 완료');
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('파일 수정 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 파일 삭제
app.delete('/api/files/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.deleteFile(id);
        
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: '파일을 찾을 수 없습니다.'
            });
        }
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('파일 삭제 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 카테고리 목록 조회
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await db.getCategories();
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('카테고리 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 테스트용 엔드포인트
app.get('/api/categories/test', (req, res) => {
    console.log('📋 테스트 엔드포인트 호출됨');
    res.json({
        success: true,
        message: '테스트 성공',
        timestamp: new Date().toISOString()
    });
});

// 카테고리 추가
app.post('/api/categories', async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                error: '카테고리 이름은 필수입니다.'
            });
        }
        
        const result = await db.addCategory(name);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('카테고리 추가 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 카테고리 수정
app.put('/api/categories/:id', async (req, res) => {
    try {
        console.log('🔄 카테고리 수정 요청 받음');
        console.log('URL:', req.url);
        console.log('Method:', req.method);
        console.log('Params:', req.params);
        console.log('Body:', req.body);
        
        const { id } = req.params;
        const { name } = req.body;
        
        console.log('추출된 ID:', id, 'Type:', typeof id);
        console.log('추출된 name:', name);
        
        if (!name) {
            console.log('❌ 카테고리 이름이 없음');
            return res.status(400).json({
                success: false,
                error: '카테고리 이름은 필수입니다.'
            });
        }
        
        console.log('📝 데이터베이스 업데이트 시작');
        const result = await db.updateCategory(id, name);
        console.log('📝 데이터베이스 업데이트 결과:', result);
        
        if (result.changes === 0) {
            console.log('❌ 변경된 행이 없음 - 카테고리를 찾을 수 없음');
            return res.status(404).json({
                success: false,
                error: '카테고리를 찾을 수 없습니다.'
            });
        }
        
        console.log('✅ 카테고리 수정 성공');
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('카테고리 수정 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 카테고리 삭제
app.delete('/api/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.deleteCategory(id);
        
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: '카테고리를 찾을 수 없습니다.'
            });
        }
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('카테고리 삭제 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 통계 정보 조회
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await db.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('통계 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 파일 다운로드
app.get('/api/download/:id/:attachmentId', async (req, res) => {
    try {
        const { id, attachmentId } = req.params;
        
        // 첨부파일 정보 조회 (간단한 쿼리로 대체)
        await db.connect();
        const query = 'SELECT * FROM file_attachments WHERE id = ? AND file_id = ?';
        
        db.db.get(query, [attachmentId, id], (err, row) => {
            if (err) {
                console.error('파일 조회 오류:', err);
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }
            
            if (!row) {
                return res.status(404).json({
                    success: false,
                    error: '파일을 찾을 수 없습니다.'
                });
            }
            
            const filePath = path.join(__dirname, row.file_path);
            
            if (fs.existsSync(filePath)) {
                // 한글 파일명을 위한 개선된 헤더 설정
                console.log('📁 다운로드 파일 정보:', {
                    original_name: row.original_name,
                    file_path: row.file_path,
                    storage_path: filePath
                });
                
                const originalName = row.original_name || 'download';
                const encodedName = encodeURIComponent(originalName);
                
                // RFC 5987을 준수하는 헤더 설정 (한글 파일명 지원)
                const stat = fs.statSync(filePath);
                const fileSize = stat.size;
                
                // Range 요청 처리
                const range = req.headers.range;
                let start = 0;
                let end = fileSize - 1;
                let statusCode = 200;
                
                if (range) {
                    const parts = range.replace(/bytes=/, "").split("-");
                    start = parseInt(parts[0], 10);
                    end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                    statusCode = 206; // Partial Content
                    
                    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
                    res.setHeader('Content-Length', (end - start + 1));
                } else {
                    res.setHeader('Content-Length', fileSize);
                }
                
                res.status(statusCode);
                res.setHeader('Content-Disposition', 
                    `attachment; filename*=UTF-8''${encodedName}`);
                res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
                res.setHeader('Accept-Ranges', 'bytes');
                res.setHeader('Cache-Control', 'public, max-age=0');
                
                // 클라이언트 연결 끊김 감지
                res.on('close', () => {
                    if (!res.headersSent) {
                        console.log('📁 다운로드 취소됨:', originalName);
                    }
                });

                // 스트림 기반 다운로드로 대용량 파일 지원 (Range 요청 지원)
                const readStream = fs.createReadStream(filePath, { start, end });
                
                readStream.on('error', (err) => {
                    console.error('📁 파일 읽기 오류:', err);
                    if (!res.headersSent) {
                        res.status(500).json({ error: '파일 읽기 실패' });
                    }
                });
                
                readStream.on('end', () => {
                    console.log('📁 다운로드 완료:', originalName);
                });
                
                // 스트림을 응답에 연결
                readStream.pipe(res);
            } else {
                res.status(404).json({
                    success: false,
                    error: '파일이 존재하지 않습니다.'
                });
            }
        });
    } catch (error) {
        console.error('파일 다운로드 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 에러 핸들러
app.use((error, req, res, next) => {
    console.error('서버 오류:', error);
    res.status(500).json({
        success: false,
        error: '서버 내부 오류가 발생했습니다.'
    });
});

// 404 핸들러
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '요청한 리소스를 찾을 수 없습니다.'
    });
});

// Vercel 서버리스 환경을 위한 export
module.exports = app;

// 로컬 개발 환경에서만 서버 시작
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
    const server = app.listen(PORT, () => {
        console.log(`🚀 자료실 서버가 포트 ${PORT}에서 실행중입니다.`);
        console.log(`📱 Admin 페이지: http://localhost:${PORT}/admin/index.html`);
        console.log(`🌐 Main 페이지: http://localhost:${PORT}/index.html`);
        console.log(`📊 API: http://localhost:${PORT}/api/files`);
    });
    
    // 대용량 파일 다운로드를 위해 서버 타임아웃을 30분으로 설정
    server.timeout = 1800000; // 30분 (30 * 60 * 1000ms)

    // 프로세스 종료 시 데이터베이스 연결 종료
    process.on('SIGINT', async () => {
        console.log('\n📝 서버를 종료합니다...');
        await db.close();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n📝 서버를 종료합니다...');
        await db.close();
        process.exit(0);
    });
}