// Supabase configuration
// ⚠️ 실제 사용 시에는 이 값들을 환경변수나 설정 파일로 관리하세요
const SUPABASE_CONFIG = {
    // 실제 Supabase 프로젝트 URL로 교체하세요
    url: 'https://kncudtzthmjegowbgnto.supabase.co',
    // 실제 Supabase anon key로 교체하세요  
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuY3VkdHp0aG1qZWdvd2JnbnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1Njc5OTksImV4cCI6MjA3MTE0Mzk5OX0.NlJN2vdgM96RvyVJE6ILQeDVUOU9X2F9vUn-jr_xlKc'
};

// Supabase 클라이언트 초기화
let supabase;

// 설정이 유효한지 확인
function isSupabaseConfigured() {
    return SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_PROJECT_URL' && 
           SUPABASE_CONFIG.anonKey !== 'YOUR_SUPABASE_ANON_KEY';
}

// Supabase 클라이언트 초기화 함수
function initializeSupabase() {
    if (!isSupabaseConfigured()) {
        console.warn('⚠️ Supabase가 설정되지 않았습니다. localStorage를 사용합니다.');
        return false;
    }

    try {
        supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log('✅ Supabase 클라이언트가 초기화되었습니다.');
        return true;
    } catch (error) {
        console.error('❌ Supabase 초기화 오류:', error);
        return false;
    }
}

// 인증 상태 변경 리스너
function setupAuthListener(callback) {
    if (!supabase) return;
    
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session);
        if (callback) callback(event, session);
    });
}

// 현재 사용자 가져오기
async function getCurrentUser() {
    if (!supabase) return null;
    
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('사용자 정보 가져오기 오류:', error);
        return null;
    }
}

// 로그인
async function signIn(email, password) {
    if (!supabase) throw new Error('Supabase가 초기화되지 않았습니다.');
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) throw error;
    return data;
}

// 회원가입
async function signUp(email, password, metadata = {}) {
    if (!supabase) throw new Error('Supabase가 초기화되지 않았습니다.');
    
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: metadata
        }
    });
    
    if (error) throw error;
    return data;
}

// 로그아웃
async function signOut() {
    if (!supabase) throw new Error('Supabase가 초기화되지 않았습니다.');
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

// 데이터베이스 헬퍼 함수들
const SupabaseHelper = {
    // 파일 목록 가져오기
    async getFiles(userId) {
        if (!supabase) throw new Error('Supabase가 초기화되지 않았습니다.');
        
        let query = supabase
            .from('files')
            .select(`
                *,
                file_attachments (*)
            `);
            
        // 공개 파일 요청이 아닌 경우에만 사용자 ID로 필터링
        if (userId !== 'public') {
            query = query.eq('user_id', userId);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
            
        if (error) throw error;
        return data;
    },

    // 파일 추가
    async addFile(fileData, userId) {
        if (!supabase) throw new Error('Supabase가 초기화되지 않았습니다.');
        
        // 데이터베이스 스키마에 맞는 필드만 추출
        const dbFileData = {
            title: fileData.title,
            description: fileData.description || '',
            category: fileData.category,
            tags: fileData.tags || [],
            user_id: userId
            // created_at, updated_at은 데이터베이스에서 자동 생성
        };
        
        const { data, error } = await supabase
            .from('files')
            .insert([dbFileData])
            .select()
            .single();
            
        if (error) throw error;
        return data;
    },

    // 파일 수정
    async updateFile(id, updates, userId) {
        if (!supabase) throw new Error('Supabase가 초기화되지 않았습니다.');
        
        // 데이터베이스 스키마에 맞는 필드만 추출
        const dbUpdates = {
            title: updates.title,
            description: updates.description,
            category: updates.category,
            tags: updates.tags || []
            // updated_at은 트리거에 의해 자동 업데이트됨
        };
        
        const { data, error } = await supabase
            .from('files')
            .update(dbUpdates)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();
            
        if (error) throw error;
        return data;
    },

    // 파일 삭제
    async deleteFile(id, userId) {
        if (!supabase) throw new Error('Supabase가 초기화되지 않았습니다.');
        
        const { error } = await supabase
            .from('files')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
            
        if (error) throw error;
    },

    // 실시간 구독 설정
    subscribeToFiles(userId, callback) {
        if (!supabase) return null;
        
        return supabase
            .channel('files')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'files',
                filter: `user_id=eq.${userId}`
            }, callback)
            .subscribe();
    },

    // 파일 업로드 (Storage)
    async uploadFile(file, filePath) {
        if (!supabase) throw new Error('Supabase가 초기화되지 않았습니다.');
        
        const { data, error } = await supabase.storage
            .from('files')
            .upload(filePath, file);
            
        if (error) throw error;
        return data;
    },

    // 파일 다운로드 URL 가져오기
    async getFileUrl(filePath) {
        if (!supabase) throw new Error('Supabase가 초기화되지 않았습니다.');
        
        try {
            // 먼저 파일이 존재하는지 확인
            const { data: fileExists, error: checkError } = await supabase.storage
                .from('files')
                .list(filePath.substring(0, filePath.lastIndexOf('/')), {
                    search: filePath.substring(filePath.lastIndexOf('/') + 1)
                });
                
            if (checkError) {
                throw new Error(`Storage 버킷 오류: ${checkError.message}`);
            }
            
            if (!fileExists || fileExists.length === 0) {
                throw new Error('파일을 찾을 수 없습니다.');
            }
            
            // 파일이 존재하면 URL 생성
            const { data } = supabase.storage
                .from('files')
                .getPublicUrl(filePath);
                
            return data.publicUrl;
        } catch (error) {
            console.error('파일 URL 생성 오류:', error);
            throw error;
        }
    },

    // 파일 삭제 (Storage)
    async deleteStorageFile(filePath) {
        if (!supabase) throw new Error('Supabase가 초기화되지 않았습니다.');
        
        const { error } = await supabase.storage
            .from('files')
            .remove([filePath]);
            
        if (error) throw error;
    },

    // 첨부파일 정보 추가
    async addFileAttachment(fileId, attachmentData) {
        if (!supabase) throw new Error('Supabase가 초기화되지 않았습니다.');
        
        const { data, error } = await supabase
            .from('file_attachments')
            .insert([{
                file_id: fileId,
                ...attachmentData
            }])
            .select()
            .single();
            
        if (error) throw error;
        return data;
    },

    // Storage 버킷 확인 및 생성
    async checkOrCreateBucket() {
        if (!supabase) throw new Error('Supabase가 초기화되지 않았습니다.');
        
        try {
            // 버킷 목록 확인
            const { data: buckets, error: listError } = await supabase.storage.listBuckets();
            
            if (listError) {
                console.error('버킷 목록 조회 오류:', listError);
                return false;
            }
            
            // 'files' 버킷이 있는지 확인
            const filesBucket = buckets.find(bucket => bucket.name === 'files');
            
            if (filesBucket) {
                console.log('✅ files 버킷이 존재합니다.');
                return true;
            } else {
                console.warn('⚠️ files 버킷이 존재하지 않습니다.');
                console.log('Supabase Dashboard에서 files 버킷을 생성해주세요.');
                return false;
            }
        } catch (error) {
            console.error('버킷 확인 오류:', error);
            return false;
        }
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