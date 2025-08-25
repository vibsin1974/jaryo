const bcrypt = require('bcrypt');
const DatabaseHelper = require('./database/db-helper');

async function resetAdminPassword() {
    const dbHelper = new DatabaseHelper();
    
    try {
        console.log('🔄 관리자 비밀번호 초기화 시작...');
        
        const password = 'Hee150603!';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        console.log('🔐 해시된 비밀번호:', hashedPassword);
        
        // 관리자 사용자 확인
        const existingUser = await dbHelper.getUserByEmail('admin@jaryo.com');
        
        if (existingUser) {
            // 기존 사용자 비밀번호 업데이트 (SQLite 용)
            await dbHelper.connect();
            const query = 'UPDATE users SET password_hash = ? WHERE email = ?';
            dbHelper.db.run(query, [hashedPassword, 'admin@jaryo.com'], function(err) {
                if (err) {
                    console.error('비밀번호 업데이트 실패:', err);
                } else {
                    console.log('✅ 기존 관리자 비밀번호가 업데이트되었습니다.');
                }
            });
        } else {
            // 새 관리자 사용자 생성
            const adminData = {
                email: 'admin@jaryo.com',
                password_hash: hashedPassword,
                name: '관리자',
                role: 'admin'
            };
            
            const result = await dbHelper.createUser(adminData);
            console.log('✅ 새 관리자 사용자가 생성되었습니다.');
        }
        
        // 로그인 테스트
        const user = await dbHelper.getUserByEmail('admin@jaryo.com');
        const isValid = await bcrypt.compare(password, user.password_hash);
        
        console.log('🧪 로그인 테스트 결과:', isValid ? '성공' : '실패');
        
        if (isValid) {
            console.log('🎉 관리자 계정 설정 완료!');
            console.log('📧 이메일: admin@jaryo.com');
            console.log('🔑 비밀번호: Hee150603!');
        }
        
        await dbHelper.close();
        
    } catch (error) {
        console.error('❌ 오류 발생:', error);
        await dbHelper.close();
        process.exit(1);
    }
}

resetAdminPassword();