// 일반 사용자용 API 클라이언트
// SQLite 백엔드와 통신하는 함수들

const API_BASE_URL = '';

// API 요청 헬퍼 함수
async function apiRequest(url, options = {}) {
    console.log(`🔗 API 요청: ${url}`);
    
    try {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            timeout: 10000, // 10초 타임아웃
            ...options
        });

        console.log(`📡 응답 상태: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const error = await response.text();
            console.error(`❌ API 오류: ${response.status} - ${error}`);
            throw new Error(`API Error: ${response.status} - ${error}`);
        }

        return response;
    } catch (error) {
        console.error(`🚨 네트워크 오류:`, error);
        throw error;
    }
}

// 공개 파일 목록 조회
async function getPublicFiles() {
    try {
        const response = await apiRequest('/api/files/public');
        return await response.json();
    } catch (error) {
        console.error('공개 파일 목록 조회 오류:', error);
        throw error;
    }
}

// 파일 다운로드
async function downloadFile(fileId, attachmentId) {
    try {
        const response = await apiRequest(`/api/download/${fileId}/${attachmentId}`);
        return response;
    } catch (error) {
        console.error('파일 다운로드 오류:', error);
        throw error;
    }
}

// 전역으로 내보내기
window.ApiClient = {
    getPublicFiles,
    downloadFile
};