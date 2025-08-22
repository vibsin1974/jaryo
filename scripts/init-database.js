const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const DatabaseHelper = require('../database/db-helper');

async function initializeDatabase() {
    console.log('🗄️ 데이터베이스 초기화 시작...');
    
    const dbHelper = new DatabaseHelper();
    
    try {
        // 데이터 디렉토리 생성
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log('📁 데이터 디렉토리 생성됨:', dataDir);
        }
        
        // 데이터베이스 연결 및 테이블 생성
        await dbHelper.connect();
        console.log('✅ 데이터베이스 연결 성공');
        
        // 기본 관리자 계정 생성
        const adminEmail = 'admin@jaryo.com';
        const adminPassword = 'Hee150603!';
        
        const existingUser = await dbHelper.getUserByEmail(adminEmail);
        
        if (!existingUser) {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
            
            const adminData = {
                email: adminEmail,
                password_hash: hashedPassword,
                name: '관리자',
                role: 'admin'
            };
            
            await dbHelper.createUser(adminData);
            console.log('👤 기본 관리자 계정 생성됨');
            console.log('📧 이메일:', adminEmail);
            console.log('🔑 비밀번호:', adminPassword);
        } else {
            console.log('👤 관리자 계정이 이미 존재합니다.');
        }
        
        // 기본 카테고리 생성
        const defaultCategories = ['문서', '이미지', '동영상', '프레젠테이션', '기타'];
        
        for (const categoryName of defaultCategories) {
            try {
                await dbHelper.addCategory(categoryName);
                console.log(`📂 카테고리 생성됨: ${categoryName}`);
            } catch (error) {
                if (error.message.includes('UNIQUE constraint failed')) {
                    console.log(`📂 카테고리 이미 존재: ${categoryName}`);
                } else {
                    console.error(`카테고리 생성 오류 (${categoryName}):`, error.message);
                }
            }
        }
        
        console.log('🎉 데이터베이스 초기화 완료!');
        
    } catch (error) {
        console.error('❌ 데이터베이스 초기화 실패:', error);
        process.exit(1);
    } finally {
        await dbHelper.close();
    }
}

// 스크립트 직접 실행 시에만 초기화 실행
if (require.main === module) {
    initializeDatabase().catch(console.error);
}

module.exports = initializeDatabase;