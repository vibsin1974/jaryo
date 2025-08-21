// Supabase configuration (오프라인 모드)
// ⚠️ 오프라인 모드로 강제 설정됨
const SUPABASE_CONFIG = {
    url: 'https://kncudtzthmjegowbgnto.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuY3VkdHp0aG1qZWdvd2JnbnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1Njc5OTksImV4cCI6MjA3MTE0Mzk5OX0.NlJN2vdgM96RvyVJE6ILQeDVUOU9X2F9vUn-jr_xlKc'
};

// Supabase 클라이언트 초기화 (강제 비활성화)
let supabase = null;

// 설정이 유효한지 확인
function isSupabaseConfigured() {
    return false; // 강제로 false 반환
}

// Supabase 클라이언트 초기화 함수 (오프라인 모드 강제)
function initializeSupabase() {
    console.log('⚠️ 오프라인 모드로 강제 설정되었습니다.');
    return false;
}

// 인증 상태 변경 리스너 (오프라인 모드용 - 빈 함수)
function setupAuthListener(callback) {
    // 오프라인 모드에서는 아무것도 하지 않음
    return;
}

// 현재 사용자 가져오기 (오프라인 모드용 - null 반환)
async function getCurrentUser() {
    return null;
}

// 로그인 (오프라인 모드용 - 빈 함수)
async function signIn(email, password) {
    throw new Error('오프라인 모드에서는 로그인할 수 없습니다.');
}

// 회원가입 (오프라인 모드용 - 빈 함수)
async function signUp(email, password, metadata = {}) {
    throw new Error('오프라인 모드에서는 회원가입할 수 없습니다.');
}

// 로그아웃 (오프라인 모드용 - 빈 함수)
async function signOut() {
    throw new Error('오프라인 모드에서는 로그아웃할 수 없습니다.');
}

// 데이터베이스 헬퍼 함수들 (오프라인 모드용)
const SupabaseHelper = {
    // 파일 목록 가져오기 (오프라인 모드용)
    async getFiles(userId) {
        console.log('🔍 SupabaseHelper.getFiles 호출됨 (오프라인 모드)');
        throw new Error('오프라인 모드에서는 Supabase 데이터베이스를 사용할 수 없습니다.');
    },

    // 파일 추가 (오프라인 모드용)
    async addFile(fileData, userId) {
        console.log('🔍 SupabaseHelper.addFile 호출됨 (오프라인 모드)');
        throw new Error('오프라인 모드에서는 Supabase 데이터베이스를 사용할 수 없습니다.');
    },

    // 파일 수정 (오프라인 모드용)
    async updateFile(id, updates, userId) {
        console.log('🔍 SupabaseHelper.updateFile 호출됨 (오프라인 모드)');
        throw new Error('오프라인 모드에서는 Supabase 데이터베이스를 사용할 수 없습니다.');
    },

    // 파일 삭제 (오프라인 모드용)
    async deleteFile(id, userId) {
        console.log('🔍 SupabaseHelper.deleteFile 호출됨 (오프라인 모드)');
        throw new Error('오프라인 모드에서는 Supabase 데이터베이스를 사용할 수 없습니다.');
    },

    // 실시간 구독 설정 (오프라인 모드용)
    subscribeToFiles(userId, callback) {
        console.log('🔍 SupabaseHelper.subscribeToFiles 호출됨 (오프라인 모드)');
        return null;
    },

    // 파일 업로드 (오프라인 모드용)
    async uploadFile(file, filePath) {
        console.log('🔍 SupabaseHelper.uploadFile 호출됨 (오프라인 모드)');
        throw new Error('오프라인 모드에서는 Supabase Storage를 사용할 수 없습니다.');
    },

    // 파일 다운로드 URL 가져오기 (오프라인 모드용)
    async getFileUrl(filePath) {
        console.log('🔍 SupabaseHelper.getFileUrl 호출됨 (오프라인 모드)');
        throw new Error('오프라인 모드에서는 Supabase Storage를 사용할 수 없습니다.');
    },
    
    // 파일 삭제 (Storage) (오프라인 모드용)
    async deleteStorageFile(filePath) {
        console.log('🔍 SupabaseHelper.deleteStorageFile 호출됨 (오프라인 모드)');
        throw new Error('오프라인 모드에서는 Supabase Storage를 사용할 수 없습니다.');
    },
    
    // 첨부파일 정보 추가 (오프라인 모드용)
    async addFileAttachment(fileId, attachmentData) {
        console.log('🔍 SupabaseHelper.addFileAttachment 호출됨 (오프라인 모드)');
        throw new Error('오프라인 모드에서는 Supabase 데이터베이스를 사용할 수 없습니다.');
    },
    
    // Storage 버킷 확인 및 생성 (오프라인 모드용)
    async checkOrCreateBucket() {
        console.log('🔍 SupabaseHelper.checkOrCreateBucket 호출됨 (오프라인 모드)');
        return false;
    }
};

// 전역으로 내보내기
window.SupabaseHelper = SupabaseHelper;
window.initializeSupabase = initializeSupabase;
window.isSupabaseConfigured = isSupabaseConfigured;
window.setupAuthListener = setupAuthListener;
window.getCurrentUser = getCurrentUser;
window.signIn = signIn;
window.signUp = signUp;
window.signOut = signOut;