// 테스트용 간단한 API
module.exports = (req, res) => {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 간단한 응답
    res.status(200).json({
        success: true,
        message: 'API가 정상 작동합니다!',
        timestamp: new Date().toISOString(),
        url: req.url,
        method: req.method
    });
};