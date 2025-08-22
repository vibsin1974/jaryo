const bcrypt = require('bcrypt');
const MariaDBHelper = require('../database/mariadb-helper');

async function initializeMariaDB() {
    console.log('🗄️ MariaDB 데이터베이스 초기화 시작...');
    
    const dbHelper = new MariaDBHelper();
    
    try {
        // 데이터베이스 연결 테스트
        await dbHelper.connect();
        console.log('✅ MariaDB 연결 성공');
        
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
        
        // 기본 카테고리 확인 및 생성
        const categories = await dbHelper.getCategories();
        const defaultCategories = ['문서', '이미지', '동영상', '프레젠테이션', '기타'];
        
        for (const categoryName of defaultCategories) {
            const existingCategory = categories.find(cat => cat.name === categoryName);
            if (!existingCategory) {
                try {
                    await dbHelper.addCategory(categoryName);
                    console.log(`📂 카테고리 생성됨: ${categoryName}`);
                } catch (error) {
                    if (error.code === 'ER_DUP_ENTRY') {
                        console.log(`📂 카테고리 이미 존재: ${categoryName}`);
                    } else {
                        console.error(`카테고리 생성 오류 (${categoryName}):`, error.message);
                    }
                }
            } else {
                console.log(`📂 카테고리 이미 존재: ${categoryName}`);
            }
        }
        
        console.log('🎉 MariaDB 초기화 완료!');
        
    } catch (error) {
        console.error('❌ MariaDB 초기화 실패:', error);
        
        // 연결 오류인 경우 상세한 도움말 제공
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOENT') {
            console.log('\n📋 MariaDB 연결 확인사항:');
            
            if (process.platform === 'win32') {
                console.log('🪟 Windows 개발 환경:');
                console.log('1. MariaDB 또는 MySQL이 설치되고 실행 중인지 확인');
                console.log('2. 환경변수 또는 .env 파일에 DB 연결 정보 설정');
                console.log('   - DB_HOST=localhost');
                console.log('   - DB_PORT=3306');
                console.log('   - DB_USER=root');
                console.log('   - DB_PASSWORD=your_password');
                console.log('   - DB_NAME=jaryo');
                console.log('\n🔧 Windows MySQL/MariaDB 설정:');
                console.log('CREATE DATABASE jaryo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
                console.log('USE jaryo;');
                console.log('-- 그 다음 database/mariadb-schema.sql 파일 실행');
            } else {
                console.log('🐧 Linux/NAS 환경:');
                console.log('1. MariaDB가 설치되고 실행 중인지 확인');
                console.log('2. 데이터베이스 "jaryo"가 생성되어 있는지 확인');
                console.log('3. 사용자 "jaryo_user"가 생성되고 권한이 있는지 확인');
                console.log('4. Unix 소켓 경로가 올바른지 확인: /run/mysqld/mysqld10.sock');
                console.log('\n🔧 NAS MariaDB 설정 명령어:');
                console.log('CREATE DATABASE jaryo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
                console.log('CREATE USER \'jaryo_user\'@\'localhost\' IDENTIFIED BY \'JaryoPass2024!@#\';');
                console.log('GRANT ALL PRIVILEGES ON jaryo.* TO \'jaryo_user\'@\'localhost\';');
                console.log('FLUSH PRIVILEGES;');
            }
        }
        
        process.exit(1);
    } finally {
        await dbHelper.close();
    }
}

// 스크립트 직접 실행 시에만 초기화 실행
if (require.main === module) {
    initializeMariaDB().catch(console.error);
}

module.exports = initializeMariaDB;