const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS 설정 - 모든 도메인 허용
app.use(cors({
    origin: true,
    credentials: true
}));

// JSON 파싱
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, '..')));

// 헬스 체크
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Jaryo File Manager is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// 루트 경로
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Jaryo File Manager</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f5f5f5;
                }
                .container {
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                h1 {
                    color: #333;
                    text-align: center;
                }
                .status {
                    background: #e8f5e8;
                    border: 1px solid #4caf50;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                }
                .feature {
                    background: #f0f8ff;
                    border: 1px solid #2196f3;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 10px 0;
                }
                .button {
                    background: #4caf50;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    text-decoration: none;
                    display: inline-block;
                    margin: 5px;
                }
                .button:hover {
                    background: #45a049;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 Jaryo File Manager</h1>
                
                <div class="status">
                    <h3>✅ 배포 성공!</h3>
                    <p>Vercel에서 성공적으로 배포되었습니다.</p>
                    <p><strong>배포 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
                </div>
                
                <div class="feature">
                    <h3>📁 주요 기능</h3>
                    <ul>
                        <li>파일 업로드 및 관리</li>
                        <li>카테고리별 분류</li>
                        <li>파일 검색 및 다운로드</li>
                        <li>관리자 기능</li>
                    </ul>
                </div>
                
                <div class="feature">
                    <h3>🔧 API 엔드포인트</h3>
                    <p><a href="/health" class="button">헬스 체크</a></p>
                    <p><a href="/api/files" class="button">파일 목록 API</a></p>
                    <p><a href="/api/categories" class="button">카테고리 API</a></p>
                </div>
                
                <div class="feature">
                    <h3>📱 페이지</h3>
                    <p><a href="/index.html" class="button">메인 페이지</a></p>
                    <p><a href="/admin/index.html" class="button">관리자 페이지</a></p>
                </div>
            </div>
        </body>
        </html>
    `);
});

// API 라우트들
app.get('/api/files', (req, res) => {
    res.json({
        success: true,
        data: [],
        message: '파일 목록 API (데모 모드)'
    });
});

app.get('/api/categories', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, name: '문서', description: '문서 파일' },
            { id: 2, name: '이미지', description: '이미지 파일' },
            { id: 3, name: '기타', description: '기타 파일' }
        ],
        message: '카테고리 목록'
    });
});

// 404 핸들러
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '요청한 리소스를 찾을 수 없습니다.',
        path: req.path
    });
});

module.exports = app;
