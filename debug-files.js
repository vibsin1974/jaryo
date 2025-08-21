const DatabaseHelper = require('./database/db-helper');
const fs = require('fs');
const path = require('path');

async function debugFiles() {
    const db = new DatabaseHelper();
    
    try {
        await db.connect();
        
        console.log('\n📋 데이터베이스의 모든 파일:');
        const files = await db.getAllFiles();
        
        files.forEach((file, index) => {
            console.log(`\n${index + 1}. ${file.title} (ID: ${file.id})`);
            console.log(`   카테고리: ${file.category}`);
            console.log(`   첨부파일: ${file.files?.length || 0}개`);
            
            if (file.files && file.files.length > 0) {
                file.files.forEach((attachment, idx) => {
                    console.log(`   ${idx + 1}) ${attachment.original_name}`);
                    console.log(`      - ID: ${attachment.id}`);
                    console.log(`      - 경로: ${attachment.file_path}`);
                    console.log(`      - 파일명: ${attachment.file_name}`);
                    console.log(`      - 크기: ${attachment.file_size}`);
                    
                    // 실제 파일 존재 확인
                    const fullPath = path.join(__dirname, attachment.file_path);
                    const exists = fs.existsSync(fullPath);
                    console.log(`      - 실제 파일 존재: ${exists ? '✅' : '❌'} (${fullPath})`);
                    
                    if (!exists) {
                        // 다른 경로들 시도
                        const paths = [
                            path.join(__dirname, 'uploads', attachment.file_name),
                            path.join(__dirname, 'uploads', attachment.original_name),
                            attachment.file_path,
                        ];
                        
                        console.log(`      - 시도할 경로들:`);
                        paths.forEach(p => {
                            const pathExists = fs.existsSync(p);
                            console.log(`        ${pathExists ? '✅' : '❌'} ${p}`);
                        });
                    }
                });
            }
        });
        
        console.log('\n📁 uploads 폴더의 실제 파일들:');
        const uploadsDir = path.join(__dirname, 'uploads');
        if (fs.existsSync(uploadsDir)) {
            const actualFiles = fs.readdirSync(uploadsDir);
            actualFiles.forEach(file => {
                const filePath = path.join(uploadsDir, file);
                const stats = fs.statSync(filePath);
                console.log(`   - ${file} (크기: ${stats.size})`);
            });
        }
        
    } catch (error) {
        console.error('❌ 오류:', error.message);
    } finally {
        await db.close();
    }
}

debugFiles();