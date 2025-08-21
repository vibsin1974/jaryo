const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = 3005;
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// 데이터 파일 초기화
function initializeData() {
    const defaultData = {
        users: [
            {
                id: '1',
                email: 'admin@jaryo.com',
                password: 'admin123',
                name: '관리자',
                role: 'admin'
            }
        ],
        files: [
            {
                id: '1',
                title: '샘플 문서',
                description: '자료실 테스트용 샘플 파일입니다.',
                category: '문서',
                tags: ['샘플', '테스트'],
                user_id: '1',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                attachments: []
            }
        ],
        categories: ['문서', '이미지', '동영상', '프레젠테이션', '기타']
    };
    
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
    }
    
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
}

// 데이터 읽기/쓰기
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('데이터 읽기 오류:', error);
        return { users: [], files: [], categories: [] };
    }
}

function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('데이터 쓰기 오류:', error);
        return false;
    }
}

// MIME 타입
const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg"
};

// API 요청 처리
async function handleApiRequest(req, res, pathname, query) {
    const data = readData();
    
    if (pathname === "/api/files/public" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            success: true,
            data: data.files,
            total: data.files.length
        }));
        return;
    }
    
    if (pathname === "/api/files" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            success: true,
            data: data.files,
            total: data.files.length
        }));
        return;
    }
    
    if (pathname === "/api/auth/login" && req.method === "POST") {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { email, password } = JSON.parse(body);
                const user = data.users.find(u => u.email === email && u.password === password);
                
                if (user) {
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        success: true,
                        user: {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            role: user.role
                        }
                    }));
                } else {
                    res.writeHead(401, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        success: false,
                        error: '이메일 또는 비밀번호가 올바르지 않습니다.'
                    }));
                }
            } catch (error) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    success: false,
                    error: '잘못된 요청입니다.'
                }));
            }
        });
        return;
    }
    
    // 기본 응답
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        success: true,
        message: "자료실 API 서버 실행 중",
        timestamp: new Date().toISOString(),
        path: pathname
    }));
}

// 정적 파일 서빙
async function serveStaticFile(req, res, pathname) {
    const filePath = path.join(__dirname, pathname);
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
            res.end(`
                <html>
                <head><title>404 Not Found</title></head>
                <body>
                    <h1>404 - 파일을 찾을 수 없습니다</h1>
                    <p>요청한 파일: ${pathname}</p>
                    <p><a href="/">홈으로 돌아가기</a></p>
                </body>
                </html>
            `);
            return;
        }
        
        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || "text/plain";
        
        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
    });
}

// HTTP 서버
const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    
    if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;
    const query = parsedUrl.query;
    
    console.log(`📨 ${req.method} ${pathname}`);
    
    if (pathname.startsWith("/api/")) {
        try {
            await handleApiRequest(req, res, pathname, query);
        } catch (error) {
            console.error('API 처리 오류:', error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                success: false,
                error: '서버 내부 오류가 발생했습니다.'
            }));
        }
        return;
    }
    
    if (pathname === "/" || pathname === "/index.html") {
        pathname = "/index.html";
    } else if (pathname === "/admin" || pathname === "/admin/") {
        pathname = "/admin/index.html";
    }
    
    await serveStaticFile(req, res, pathname);
});

server.listen(PORT, () => {
    console.log(`🚀 향상된 자료실 서버가 포트 ${PORT}에서 실행 중입니다`);
    console.log(`📍 접속 URL: http://119.64.1.86:${PORT}`);
    console.log(`🔧 관리자 URL: http://119.64.1.86:${PORT}/admin`);
    console.log(`⏰ 시작 시간: ${new Date().toLocaleString("ko-KR")}`);
    
    initializeData();
    console.log(`✅ 데이터 파일 초기화 완료`);
});

process.on("SIGINT", () => {
    console.log("\n🛑 서버를 종료합니다...");
    server.close(() => {
        console.log("✅ 서버가 정상적으로 종료되었습니다");
        process.exit(0);
    });
});