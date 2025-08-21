// Vercel Serverless 함수 핸들러
export default function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { url, method } = req;
    
    // 헬스 체크
    if (url === '/health' || url === '/api/health') {
        res.json({
            success: true,
            message: 'Jaryo File Manager is running',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'production',
            path: url
        });
        return;
    }

    // 루트 경로
    if (url === '/' || url === '/api') {
        res.setHeader('Content-Type', 'text/html');
        res.send(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Jaryo File Manager</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
                .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #333; text-align: center; }
                .status { background: #e8f5e8; border: 1px solid #4caf50; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .feature { background: #f0f8ff; border: 1px solid #2196f3; padding: 15px; border-radius: 5px; margin: 10px 0; }
                .button { background: #4caf50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; margin: 5px; }
                .button:hover { background: #45a049; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 Jaryo File Manager</h1>
                <div class="status">
                    <h3>✅ 배포 성공!</h3>
                    <p>Vercel Serverless에서 성공적으로 실행 중입니다.</p>
                    <p><strong>시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
                </div>
                <div class="feature">
                    <h3>🔧 API 엔드포인트</h3>
                    <p><a href="/health" class="button">헬스 체크</a></p>
                    <p><a href="/api/files" class="button">파일 목록 API</a></p>
                    <p><a href="/api/files/public" class="button">공개 파일 API</a></p>
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
        return;
    }

    // API 라우트들
    if (url === '/api/files' || url === '/api/files/public') {
        res.json({
            success: true,
            data: [
                {
                    id: 1,
                    title: '샘플 문서',
                    description: '데모용 파일입니다',
                    category: '문서',
                    tags: ['샘플', '테스트'],
                    created_at: new Date().toISOString(),
                    file_url: '#'
                },
                {
                    id: 2,
                    title: '이미지 파일',
                    description: '예시 이미지',
                    category: '이미지',
                    tags: ['샘플'],
                    created_at: new Date().toISOString(),
                    file_url: '#'
                }
            ],
            message: url.includes('public') ? '공개 파일 목록' : '파일 목록 API (데모 모드)'
        });
        return;
    }

    if (url === '/api/categories') {
        res.json({
            success: true,
            data: [
                { id: 1, name: '문서', description: '문서 파일' },
                { id: 2, name: '이미지', description: '이미지 파일' },
                { id: 3, name: '동영상', description: '동영상 파일' },
                { id: 4, name: '프레젠테이션', description: '프레젠테이션 파일' },
                { id: 5, name: '기타', description: '기타 파일' }
            ],
            message: '카테고리 목록'
        });
        return;
    }

    // 404 핸들러
    res.status(404).json({
        success: false,
        error: '요청한 리소스를 찾을 수 없습니다.',
        path: url,
        method: method
    });
}
