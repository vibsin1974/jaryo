const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 데이터베이스 파일 경로
const dbPath = path.join(__dirname, '../database/jaryo.db');
const schemaPath = path.join(__dirname, '../database/schema.sql');

// database 폴더가 없으면 생성
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// uploads 폴더도 생성
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

console.log('🔧 SQLite 데이터베이스 초기화 시작...');

// 데이터베이스 연결
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ 데이터베이스 연결 오류:', err.message);
        return;
    }
    console.log('✅ SQLite 데이터베이스 연결 성공');
});

// 스키마 파일 읽기 및 실행
fs.readFile(schemaPath, 'utf8', (err, schema) => {
    if (err) {
        console.error('❌ 스키마 파일 읽기 오류:', err.message);
        return;
    }

    // 여러 SQL 문을 분리하여 실행
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    db.serialize(() => {
        statements.forEach((statement, index) => {
            if (statement.trim()) {
                db.run(statement + ';', (err) => {
                    if (err) {
                        console.error(`❌ SQL 실행 오류 (${index + 1}):`, err.message);
                        console.error('실행하려던 SQL:', statement);
                    }
                });
            }
        });
        
        console.log('✅ 데이터베이스 스키마 생성 완료');
        
        // 데이터 확인
        db.all('SELECT COUNT(*) as count FROM files', (err, rows) => {
            if (err) {
                console.error('❌ 데이터 확인 오류:', err.message);
            } else {
                console.log(`📊 파일 테이블 레코드 수: ${rows[0].count}`);
            }
            
            db.close((err) => {
                if (err) {
                    console.error('❌ 데이터베이스 종료 오류:', err.message);
                } else {
                    console.log('🏁 데이터베이스 초기화 완료');
                }
            });
        });
    });
});