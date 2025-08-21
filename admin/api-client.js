// 관리자용 API 클라이언트
// SQLite 백엔드와 통신하는 함수들

const API_BASE_URL = '';

// API 요청 헬퍼 함수
async function apiRequest(url, options = {}) {
    const fullUrl = `${API_BASE_URL}${url}`;
    console.log('🌐 API 요청:', options.method || 'GET', fullUrl);
    console.log('요청 옵션:', options);
    
    const response = await fetch(fullUrl, {
        credentials: 'include', // 세션 쿠키 포함
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    });

    console.log('📨 응답 받음:', response.status, response.statusText);
    console.log('응답 URL:', response.url);

    if (!response.ok) {
        const error = await response.text();
        console.error('❌ API 오류 응답:', error);
        throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response;
}

// 인증 관련 API
const AuthAPI = {
    // 현재 세션 확인
    async getSession() {
        try {
            const response = await apiRequest('/api/auth/session');
            return await response.json();
        } catch (error) {
            console.error('세션 확인 오류:', error);
            return { user: null };
        }
    },

    // 로그인
    async login(email, password) {
        try {
            const response = await apiRequest('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            return await response.json();
        } catch (error) {
            console.error('로그인 오류:', error);
            throw error;
        }
    },

    // 로그아웃
    async logout() {
        try {
            await apiRequest('/api/auth/logout', {
                method: 'POST'
            });
        } catch (error) {
            console.error('로그아웃 오류:', error);
            throw error;
        }
    }
};

// 파일 관리 API
const FilesAPI = {
    // 모든 파일 조회 (관리자용)
    async getAll() {
        try {
            const response = await apiRequest('/api/files');
            return await response.json();
        } catch (error) {
            console.error('파일 목록 조회 오류:', error);
            throw error;
        }
    },

    // 공개 파일 조회 (일반 사용자용)
    async getPublic() {
        try {
            const response = await apiRequest('/api/files/public');
            return await response.json();
        } catch (error) {
            console.error('공개 파일 목록 조회 오류:', error);
            throw error;
        }
    },

    // 파일 추가
    async create(formData) {
        try {
            const response = await fetch('/api/files', {
                method: 'POST',
                credentials: 'include',
                body: formData // FormData는 Content-Type 헤더를 자동 설정
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`API Error: ${response.status} - ${error}`);
            }

            return await response.json();
        } catch (error) {
            console.error('파일 추가 오류:', error);
            throw error;
        }
    },

    // 파일 수정 (FormData 지원)
    async update(id, data) {
        try {
            let requestOptions;
            
            if (data instanceof FormData) {
                // FormData인 경우 (파일 업로드 포함)
                requestOptions = {
                    method: 'PUT',
                    credentials: 'include',
                    body: data // FormData는 Content-Type 헤더를 자동 설정
                };
                
                console.log('📁 FormData를 사용한 파일 수정 요청');
                const response = await fetch(`/api/files/${id}`, requestOptions);
                
                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`API Error: ${response.status} - ${error}`);
                }
                
                return await response.json();
            } else {
                // 일반 JSON 데이터인 경우
                const response = await apiRequest(`/api/files/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
                return await response.json();
            }
        } catch (error) {
            console.error('파일 수정 오류:', error);
            throw error;
        }
    },

    // 파일 삭제
    async delete(id) {
        try {
            await apiRequest(`/api/files/${id}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('파일 삭제 오류:', error);
            throw error;
        }
    },

    // 파일 다운로드
    async download(fileId, attachmentId) {
        try {
            const response = await apiRequest(`/api/download/${fileId}/${attachmentId}`);
            return response;
        } catch (error) {
            console.error('파일 다운로드 오류:', error);
            throw error;
        }
    }
};

// 카테고리 관리 API
const CategoriesAPI = {
    // 모든 카테고리 조회
    async getAll() {
        try {
            const response = await apiRequest('/api/categories');
            return await response.json();
        } catch (error) {
            console.error('카테고리 목록 조회 오류:', error);
            throw error;
        }
    },

    // 카테고리 추가
    async create(name) {
        try {
            const response = await apiRequest('/api/categories', {
                method: 'POST',
                body: JSON.stringify({ name })
            });
            return await response.json();
        } catch (error) {
            console.error('카테고리 추가 오류:', error);
            throw error;
        }
    },

    // 카테고리 수정
    async update(id, name) {
        try {
            const url = `/api/categories/${id}`;
            console.log('🔄 카테고리 수정 API 호출:', url);
            console.log('전송 데이터:', { id, name });
            
            const response = await apiRequest(url, {
                method: 'PUT',
                body: JSON.stringify({ name })
            });
            
            console.log('API 응답 상태:', response.status);
            const result = await response.json();
            console.log('API 응답 데이터:', result);
            return result;
        } catch (error) {
            console.error('카테고리 수정 오류:', error);
            throw error;
        }
    },

    // 카테고리 삭제
    async delete(id) {
        try {
            await apiRequest(`/api/categories/${id}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('카테고리 삭제 오류:', error);
            throw error;
        }
    }
};

// 연결 테스트 API
const SystemAPI = {
    // 서버 연결 테스트
    async testConnection() {
        try {
            const response = await fetch('/api/health');
            return response.ok;
        } catch (error) {
            console.error('연결 테스트 오류:', error);
            return false;
        }
    }
};

// 전역으로 내보내기
window.AdminAPI = {
    Auth: AuthAPI,
    Files: FilesAPI,
    Categories: CategoriesAPI,
    System: SystemAPI
};
