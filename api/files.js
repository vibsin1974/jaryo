// 파일 API
module.exports = (req, res) => {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 샘플 파일 데이터
    const files = [
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
    ];

    res.status(200).json({
        success: true,
        data: files,
        message: '파일 목록을 성공적으로 불러왔습니다.'
    });
};