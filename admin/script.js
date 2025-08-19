class FileManager {
    constructor() {
        this.files = [];
        this.allFiles = []; // 전체 파일 목록
        this.currentPage = 1; // 현재 페이지
        this.selectedFiles = []; // 선택된 파일들
        this.currentEditId = null;
        this.currentUser = null;
        this.isOnline = navigator.onLine;
        this.realtimeSubscription = null;
        this.authMode = 'login'; // 'login' or 'signup'
        this.isOfflineMode = true; // 강제 오프라인 모드
        
        this.init();
    }

    async init() {
        console.log('🔍 FileManager 초기화 시작');
        
        // Supabase 초기화 - 임시로 false로 설정 (Storage 오류 우회)
        const supabaseInitialized = false; // initializeSupabase();
        console.log('🔍 supabaseInitialized:', supabaseInitialized);
        
        if (supabaseInitialized) {
            console.log('✅ Supabase 모드로 실행합니다.');
            await this.initializeAuth();
        } else {
            console.log('⚠️ 오프라인 모드로 실행합니다.');
            // 오프라인 모드에서는 가상 사용자 설정
            this.currentUser = { id: 'offline-user', email: 'offline@local.com' };
            console.log('🔍 가상 사용자 설정:', this.currentUser);
            
            this.files = this.loadFiles();
            console.log('🔍 파일 로드 완료:', this.files.length, '개');
            
            this.showOfflineMode();
            this.updateAuthUI();
            console.log('🔍 UI 업데이트 완료');
        }
        
        this.bindEvents();
        this.renderFiles();
        this.updateEmptyState();
        this.setupOnlineStatusListener();
        
        // 인증 함수들을 빈 함수로 덮어씌움 (완전 차단)
        this.overrideAuthFunctions();
    }

    bindEvents() {
        // 기존 이벤트
        document.getElementById('fileForm').addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('cancelBtn').addEventListener('click', () => this.clearForm());
        document.getElementById('searchBtn').addEventListener('click', () => this.handleSearch());
        document.getElementById('searchInput').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        document.getElementById('categoryFilter').addEventListener('change', () => this.handleSearch());
        document.getElementById('sortBy').addEventListener('change', () => this.renderFiles());
        document.getElementById('editForm').addEventListener('submit', (e) => this.handleEditSubmit(e));
        document.getElementById('closeModal').addEventListener('click', () => this.closeEditModal());
        document.getElementById('fileUpload').addEventListener('change', (e) => this.handleFileUpload(e));
        
        // 페이지네이션 이벤트
        document.getElementById('prevPage').addEventListener('click', () => this.goToPrevPage());
        document.getElementById('nextPage').addEventListener('click', () => this.goToNextPage());
        
        // 드래그 앤 드롭 이벤트
        this.setupDragAndDrop();

        // 인증 이벤트 (오프라인 모드에서는 비활성화)
        if (window.supabase) {
            document.getElementById('loginBtn').addEventListener('click', () => this.openAuthModal('login'));
            document.getElementById('signupBtn').addEventListener('click', () => this.openAuthModal('signup'));
            document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
            document.getElementById('authForm').addEventListener('submit', (e) => this.handleAuthSubmit(e));
            document.getElementById('authCancelBtn').addEventListener('click', () => this.closeAuthModal());
            document.getElementById('authSwitchLink').addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAuthMode();
            });
        } else {
            // 오프라인 모드에서는 로그인 버튼 클릭 차단
            document.getElementById('loginBtn').addEventListener('click', (e) => {
                e.preventDefault();
                alert('현재 오프라인 모드입니다. 로그인 기능을 사용할 수 없습니다.');
            });
            document.getElementById('signupBtn').addEventListener('click', (e) => {
                e.preventDefault();
                alert('현재 오프라인 모드입니다. 회원가입 기능을 사용할 수 없습니다.');
            });
        }

        // 모달 이벤트
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('editModal')) {
                this.closeEditModal();
            }
            if (e.target === document.getElementById('authModal')) {
                this.closeAuthModal();
            }
        });
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 파일 확장자 추출 (안전한 형태로)
    getFileExtension(fileName) {
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex > 0 && lastDotIndex < fileName.length - 1) {
            return fileName.substring(lastDotIndex).toLowerCase();
        }
        return ''; // 확장자가 없는 경우
    }

    // 브라우저별 다운로드 폴더 경로 추정
    getDownloadFolderPath() {
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform.toLowerCase();
        
        if (platform.includes('win')) {
            return '다운로드 폴더 (C:\\Users\\사용자명\\Downloads)';
        } else if (platform.includes('mac')) {
            return '다운로드 폴더 (~/Downloads)';
        } else if (platform.includes('linux')) {
            return '다운로드 폴더 (~/Downloads)';
        } else {
            return '브라우저 기본 다운로드 폴더';
        }
    }

    // 인증 관련 메서드들
    async initializeAuth() {
        try {
            const user = await getCurrentUser();
            if (user) {
                this.currentUser = user;
                this.updateAuthUI(true);
                await this.loadUserFiles();
                this.setupRealtimeSubscription();
            } else {
                this.updateAuthUI(false);
                // 게스트 모드: 공개 파일 로드
                await this.loadPublicFiles();
                this.showGuestMode();
            }

            setupAuthListener((event, session) => {
                if (event === 'SIGNED_IN') {
                    this.currentUser = session.user;
                    this.updateAuthUI(true);
                    this.loadUserFiles();
                    this.setupRealtimeSubscription();
                } else if (event === 'SIGNED_OUT') {
                    this.currentUser = null;
                    this.updateAuthUI(false);
                    this.loadPublicFiles();
                    this.showGuestMode();
                    this.cleanupRealtimeSubscription();
                }
            });
        } catch (error) {
            console.error('인증 초기화 오류:', error);
        }
    }

    updateAuthUI(isAuthenticated) {
        const authButtons = document.getElementById('authButtons');
        const userInfo = document.getElementById('userInfo');
        const userEmail = document.getElementById('userEmail');
        const formSection = document.querySelector('.form-section');

        if (isAuthenticated && this.currentUser) {
            authButtons.style.display = 'none';
            userInfo.style.display = 'flex';
            userEmail.textContent = this.currentUser.email;
            formSection.style.display = 'block';
            this.updateSyncStatus();
            this.hideGuestMode();
        } else {
            authButtons.style.display = 'flex';
            userInfo.style.display = 'none';
            formSection.style.display = 'none';
        }
    }

    updateSyncStatus(status = 'auto') {
        const syncStatusElement = document.getElementById('syncStatus');
        if (!syncStatusElement) return;

        // 자동 상태 판단
        if (status === 'auto') {
            if (!isSupabaseConfigured()) {
                status = 'offline';
            } else if (this.currentUser) {
                status = 'online';
            } else {
                status = 'offline';
            }
        }

        // 상태 업데이트
        syncStatusElement.className = `sync-status ${status}`;
        switch (status) {
            case 'online':
                syncStatusElement.textContent = '🟢 온라인';
                break;
            case 'offline':
                syncStatusElement.textContent = '🟡 오프라인';
                break;
            case 'syncing':
                syncStatusElement.textContent = '🔄 동기화 중';
                break;
            case 'error':
                syncStatusElement.textContent = '🔴 오류';
                break;
        }
    }

    openAuthModal(mode) {
        // 오프라인 모드에서는 모달 열지 않음
        if (!window.supabase) {
            alert('현재 오프라인 모드입니다. 로그인 기능을 사용할 수 없습니다.');
            return;
        }
        
        this.authMode = mode;
        const modal = document.getElementById('authModal');
        const title = document.getElementById('authModalTitle');
        const submitBtn = document.getElementById('authSubmitBtn');
        const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
        const switchText = document.getElementById('authSwitchText');

        if (mode === 'signup') {
            title.textContent = '👤 회원가입';
            submitBtn.textContent = '👤 회원가입';
            confirmPasswordGroup.style.display = 'block';
            switchText.innerHTML = '이미 계정이 있으신가요? <a href="#" id="authSwitchLink">로그인하기</a>';
        } else {
            title.textContent = '🔑 로그인';
            submitBtn.textContent = '🔑 로그인';
            confirmPasswordGroup.style.display = 'none';
            switchText.innerHTML = '계정이 없으신가요? <a href="#" id="authSwitchLink">회원가입하기</a>';
        }

        // 이벤트 리스너 재바인딩
        const newSwitchLink = document.getElementById('authSwitchLink');
        newSwitchLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleAuthMode();
        });

        modal.style.display = 'block';
    }

    closeAuthModal() {
        document.getElementById('authModal').style.display = 'none';
        document.getElementById('authForm').reset();
        document.getElementById('authLoading').style.display = 'none';
    }

    toggleAuthMode() {
        this.authMode = this.authMode === 'login' ? 'signup' : 'login';
        this.openAuthModal(this.authMode);
    }

    async handleAuthSubmit(e) {
        e.preventDefault();
        
        // 강제 오프라인 모드 - 모든 인증 시도 차단
        if (this.isOfflineMode || !window.supabase) {
            alert('현재 오프라인 모드입니다. 로그인 기능을 사용할 수 없습니다.');
            this.closeAuthModal();
            return;
        }
        
        const email = document.getElementById('authEmail').value.trim();
        const password = document.getElementById('authPassword').value;
        const confirmPassword = document.getElementById('authConfirmPassword').value;
        
        if (!email || !password) {
            alert('이메일과 비밀번호를 입력해주세요.');
            return;
        }

        if (this.authMode === 'signup' && password !== confirmPassword) {
            alert('비밀번호가 일치하지 않습니다.');
            return;
        }

        this.showAuthLoading(true);

        try {
            if (this.authMode === 'signup') {
                await signUp(email, password);
                alert('회원가입이 완료되었습니다! 이메일을 확인해주세요.');
            } else {
                await signIn(email, password);
            }
            this.closeAuthModal();
        } catch (error) {
            console.error('인증 오류:', error);
            alert(`${this.authMode === 'signup' ? '회원가입' : '로그인'} 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            this.showAuthLoading(false);
        }
    }

    async handleLogout() {
        // 오프라인 모드에서는 로그아웃 불가
        if (!window.supabase) {
            alert('현재 오프라인 모드입니다. 로그아웃 기능을 사용할 수 없습니다.');
            return;
        }
        
        try {
            await signOut();
            this.showNotification('로그아웃되었습니다.', 'success');
        } catch (error) {
            console.error('로그아웃 오류:', error);
            alert('로그아웃 중 오류가 발생했습니다.');
        }
    }

    showAuthLoading(show) {
        const loading = document.getElementById('authLoading');
        const form = document.getElementById('authForm');
        
        if (show) {
            loading.style.display = 'block';
            form.style.display = 'none';
        } else {
            loading.style.display = 'none';
            form.style.display = 'block';
        }
    }

    // 인증 함수 완전 차단
    overrideAuthFunctions() {
        // 전역 인증 함수들을 빈 함수로 덮어씌움
        if (typeof signIn === 'function') {
            window.signIn = () => {
                throw new Error('오프라인 모드에서는 로그인할 수 없습니다.');
            };
        }
        if (typeof signUp === 'function') {
            window.signUp = () => {
                throw new Error('오프라인 모드에서는 회원가입할 수 없습니다.');
            };
        }
        if (typeof signOut === 'function') {
            window.signOut = () => {
                throw new Error('오프라인 모드에서는 로그아웃할 수 없습니다.');
            };
        }
        if (typeof getCurrentUser === 'function') {
            window.getCurrentUser = () => Promise.resolve(null);
        }
    }

    // 인증 UI 업데이트
    updateAuthUI(isAuthenticated = true) {
        const authButtons = document.getElementById('authButtons');
        const userInfo = document.getElementById('userInfo');
        const userEmail = document.getElementById('userEmail');
        const formSection = document.querySelector('.form-section');
        
        // 오프라인 모드에서는 항상 로그인된 것처럼 처리
        if ((isAuthenticated && this.currentUser) || !window.supabase) {
            if (authButtons) authButtons.style.display = 'none';
            if (userInfo) userInfo.style.display = 'flex';
            if (userEmail) userEmail.textContent = this.currentUser?.email || '오프라인 사용자';
            if (formSection) formSection.style.display = 'block';
            if (window.supabase && this.updateSyncStatus) {
                this.updateSyncStatus('online');
            }
            this.hideGuestMode();
        } else {
            if (authButtons) authButtons.style.display = 'flex';
            if (userInfo) userInfo.style.display = 'none';
            if (formSection) formSection.style.display = 'none';
            this.showGuestMode();
        }
    }

    // 오프라인 모드 관련
    showOfflineMode() {
        const container = document.querySelector('.container');
        const offlineNotice = document.createElement('div');
        offlineNotice.className = 'offline-mode';
        offlineNotice.innerHTML = '⚠️ 오프라인 모드: 로컬 저장소를 사용합니다. 로그인 없이 모든 기능을 사용할 수 있습니다.';
        container.insertBefore(offlineNotice, container.firstChild.nextSibling);
    }

    // 게스트 모드 관련
    showGuestMode() {
        this.hideGuestMode(); // 기존 알림 제거
        const container = document.querySelector('.container');
        const guestNotice = document.createElement('div');
        guestNotice.className = 'guest-mode';
        guestNotice.id = 'guestModeNotice';
        guestNotice.innerHTML = `
            <div class="guest-mode-content">
                <span>👤 오프라인 모드 - 로컬 저장소를 사용합니다</span>
                <span class="offline-info">⚠️ 인터넷 연결 시 Supabase 기능을 사용할 수 있습니다</span>
            </div>
        `;
        container.insertBefore(guestNotice, container.firstChild.nextSibling);
    }

    hideGuestMode() {
        const guestNotice = document.getElementById('guestModeNotice');
        if (guestNotice) {
            guestNotice.remove();
        }
    }

    // 공개 파일 로드 (게스트용)
    async loadPublicFiles() {
        if (isSupabaseConfigured()) {
            try {
                // Supabase에서 모든 파일 로드 (RLS로 공개 파일만 접근 가능)
                const data = await SupabaseHelper.getFiles('public');
                this.files = data.map(file => ({
                    ...file,
                    files: file.file_attachments || [],
                    isReadOnly: true
                }));
            } catch (error) {
                console.error('공개 파일 로딩 오류:', error);
                // localStorage 폴백
                this.files = this.loadFiles().map(file => ({ ...file, isReadOnly: true }));
            }
        } else {
            // 오프라인 모드: localStorage의 파일을 읽기 전용으로 로드
            this.files = this.loadFiles().map(file => ({ ...file, isReadOnly: true }));
        }
        this.renderFiles();
        this.updateEmptyState();
    }

    setupOnlineStatusListener() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNotification('온라인 상태가 되었습니다.', 'success');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNotification('오프라인 상태입니다.', 'info');
        });
    }

    // Supabase 데이터베이스 연동 메서드들
    async loadUserFiles() {
        if (!this.currentUser || !isSupabaseConfigured()) {
            this.files = this.loadFiles(); // localStorage 폴백
            this.updateSyncStatus('offline');
            return;
        }

        try {
            this.updateSyncStatus('syncing');
            const data = await SupabaseHelper.getFiles(this.currentUser.id);
            this.files = data.map(file => ({
                ...file,
                files: file.file_attachments || [] // 첨부파일 정보 매핑
            }));
            this.renderFiles();
            this.updateEmptyState();
            this.updateSyncStatus('online');
        } catch (error) {
            console.error('파일 로딩 오류:', error);
            this.showNotification('파일을 불러오는 중 오류가 발생했습니다.', 'error');
            this.updateSyncStatus('error');
            // 오류 시 localStorage 폴백
            this.files = this.loadFiles();
        }
    }

    async addFileToSupabase(fileData) {
        if (!this.currentUser || !isSupabaseConfigured()) {
            return this.addFileLocally(fileData);
        }

        try {
            this.updateSyncStatus('syncing');
            console.log('파일 데이터 추가 중...', fileData);
            
            const result = await SupabaseHelper.addFile(fileData, this.currentUser.id);
            console.log('파일 데이터 추가 성공:', result);
            
            // 첨부파일이 있는 경우 파일 업로드 처리
            if (fileData.files && fileData.files.length > 0) {
                console.log(`${fileData.files.length}개의 첨부파일 업로드 시작...`);
                await this.uploadAttachments(result.id, fileData.files);
                console.log('모든 첨부파일 업로드 완료');
            }

            this.showNotification('새 자료가 성공적으로 추가되었습니다!', 'success');
            await this.loadUserFiles(); // 목록 새로고침
            this.updateSyncStatus('online');
            this.clearForm(); // 폼 초기화
            
        } catch (error) {
            console.error('파일 추가 오류:', error);
            
            // 더 구체적인 에러 메시지 제공
            let errorMessage = '파일 추가 중 오류가 발생했습니다.';
            if (error.message) {
                errorMessage += ` (${error.message})`;
            }
            
            this.showNotification(errorMessage, 'error');
            this.updateSyncStatus('error');
            
            // 콘솔에 상세 오류 정보 출력
            if (error.details) {
                console.error('오류 상세:', error.details);
            }
            if (error.hint) {
                console.error('오류 힌트:', error.hint);
            }
        }
    }

    async updateFileInSupabase(id, updates) {
        if (!this.currentUser || !isSupabaseConfigured()) {
            return this.updateFileLocally(id, updates);
        }

        try {
            await SupabaseHelper.updateFile(id, updates, this.currentUser.id);
            this.showNotification('자료가 성공적으로 수정되었습니다!', 'success');
            await this.loadUserFiles(); // 목록 새로고침
        } catch (error) {
            console.error('파일 수정 오류:', error);
            this.showNotification('파일 수정 중 오류가 발생했습니다.', 'error');
        }
    }

    async deleteFileFromSupabase(id) {
        if (!this.currentUser || !isSupabaseConfigured()) {
            return this.deleteFileLocally(id);
        }

        try {
            // 첨부파일들을 Storage에서 삭제
            await this.deleteAttachmentsFromStorage(id);
            
            // 데이터베이스에서 파일 삭제 (CASCADE로 첨부파일 정보도 함께 삭제)
            await SupabaseHelper.deleteFile(id, this.currentUser.id);
            this.showNotification('자료가 성공적으로 삭제되었습니다!', 'success');
            await this.loadUserFiles(); // 목록 새로고침
        } catch (error) {
            console.error('파일 삭제 오류:', error);
            this.showNotification('파일 삭제 중 오류가 발생했습니다.', 'error');
        }
    }

    // localStorage 폴백 메서드들
    addFileLocally(fileData) {
        // 로컬 저장용 데이터 생성 (ID와 타임스탬프 추가)
        const localFileData = {
            id: this.generateId(),
            ...fileData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // 첨부파일이 있는 경우, localStorage에 바로 저장 가능한 형태로 처리
        if (fileData.files && fileData.files.length > 0) {
            // 첨부파일 데이터가 이미 base64 형태로 준비되어 있으므로 그대로 사용
            localFileData.files = fileData.files.map(file => ({
                name: file.name,
                original_name: file.name,
                size: file.size,
                type: file.type,
                data: file.data // base64 데이터
            }));
        } else {
            localFileData.files = [];
        }
        
        this.files.push(localFileData);
        this.saveFiles();
        this.renderFiles();
        this.updateEmptyState();
        this.showNotification('새 자료가 성공적으로 추가되었습니다! (로컬 저장)', 'success');
        this.clearForm(); // 폼 초기화
    }

    updateFileLocally(id, updates) {
        const fileIndex = this.files.findIndex(f => f.id === id);
        if (fileIndex !== -1) {
            this.files[fileIndex] = {
                ...this.files[fileIndex],
                ...updates,
                updated_at: new Date().toISOString()
            };
            this.saveFiles();
            this.renderFiles();
            this.showNotification('자료가 성공적으로 수정되었습니다! (로컬 저장)', 'success');
        }
    }

    deleteFileLocally(id) {
        this.files = this.files.filter(f => f.id !== id);
        this.saveFiles();
        this.renderFiles();
        this.updateEmptyState();
        this.showNotification('자료가 성공적으로 삭제되었습니다! (로컬 저장)', 'success');
    }

    // 실시간 구독 관련
    setupRealtimeSubscription() {
        if (!this.currentUser || !isSupabaseConfigured()) return;

        this.realtimeSubscription = SupabaseHelper.subscribeToFiles(
            this.currentUser.id,
            (payload) => {
                console.log('실시간 업데이트:', payload);
                this.loadUserFiles(); // 변경사항이 있으면 목록 새로고침
            }
        );
    }

    cleanupRealtimeSubscription() {
        if (this.realtimeSubscription) {
            this.realtimeSubscription.unsubscribe();
            this.realtimeSubscription = null;
        }
    }

    // 파일 업로드 관련 메서드들
    async uploadAttachments(fileId, attachments) {
        if (!isSupabaseConfigured() || !this.currentUser) {
            console.log('오프라인 모드: 첨부파일을 base64로 저장합니다.');
            return; // 오프라인 모드에서는 base64로 저장된 상태 유지
        }

        const uploadedFiles = [];
        
        try {
            for (let i = 0; i < attachments.length; i++) {
                const attachment = attachments[i];
                
                try {
                    console.log(`파일 업로드 중... (${i + 1}/${attachments.length}): ${attachment.name}`);
                    
                    // base64 데이터를 Blob으로 변환
                    const response = await fetch(attachment.data);
                    const blob = await response.blob();
                    
                    // 안전한 파일명 생성 (고유한 이름으로 저장, 원본명은 DB에 저장)
                    const fileExtension = this.getFileExtension(attachment.name);
                    const safeFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${fileExtension}`;
                    const filePath = `${this.currentUser.id}/${fileId}/${safeFileName}`;
                    
                    // Storage 버킷 확인
                    const bucketExists = await SupabaseHelper.checkOrCreateBucket();
                    if (!bucketExists) {
                        throw new Error('Storage 버킷 접근 권한이 없습니다. Storage 정책을 확인해주세요.');
                    }
                    
                    // Supabase Storage에 업로드
                    const uploadResult = await SupabaseHelper.uploadFile(blob, filePath);
                    console.log('Storage 업로드 성공:', uploadResult);
                    
                    // 데이터베이스에 첨부파일 정보 저장
                    const attachmentResult = await this.addFileAttachment(fileId, {
                        original_name: attachment.name,
                        storage_path: filePath,
                        file_size: attachment.size || blob.size,
                        mime_type: attachment.type || blob.type
                    });
                    
                    uploadedFiles.push(attachmentResult);
                    console.log('첨부파일 정보 저장 성공:', attachmentResult);
                    
                } catch (fileError) {
                    console.error(`파일 "${attachment.name}" 업로드 실패:`, fileError);
                    throw new Error(`파일 "${attachment.name}" 업로드에 실패했습니다: ${fileError.message}`);
                }
            }
            
            console.log('모든 첨부파일 업로드 완료:', uploadedFiles);
            return uploadedFiles;
            
        } catch (error) {
            console.error('파일 업로드 오류:', error);
            
            // 부분적으로 업로드된 파일들 정리 (선택사항)
            try {
                for (const uploadedFile of uploadedFiles) {
                    if (uploadedFile.storage_path) {
                        await SupabaseHelper.deleteStorageFile(uploadedFile.storage_path);
                    }
                }
            } catch (cleanupError) {
                console.error('업로드 실패 파일 정리 중 오류:', cleanupError);
            }
            
            throw error;
        }
    }

    async addFileAttachment(fileId, attachmentData) {
        if (!isSupabaseConfigured()) {
            return; // 오프라인 모드에서는 처리하지 않음
        }

        try {
            // SupabaseHelper를 통해 첨부파일 정보 저장
            const result = await SupabaseHelper.addFileAttachment(fileId, attachmentData);
            return result;
        } catch (error) {
            console.error('첨부파일 정보 저장 오류:', error);
            throw error;
        }
    }

    async downloadFileFromStorage(filePath, originalName) {
        if (!isSupabaseConfigured()) {
            return; // 오프라인 모드에서는 처리하지 않음
        }

        try {
            console.log('파일 다운로드 시도:', filePath, originalName);
            
            // Storage 버킷 확인
            const bucketExists = await SupabaseHelper.checkOrCreateBucket();
            if (!bucketExists) {
                throw new Error('Storage 버킷 접근 권한이 없습니다. Storage 정책을 확인해주세요.');
            }
            
            const url = await SupabaseHelper.getFileUrl(filePath);
            console.log('다운로드 URL 생성:', url);
            
            // 다운로드 링크 생성
            const link = document.createElement('a');
            link.href = url;
            link.download = originalName;
            
            // Ctrl/Cmd 키를 누른 상태에서 클릭하면 "다른 이름으로 저장" 대화상자 표시
            if (window.event && (window.event.ctrlKey || window.event.metaKey)) {
                link.target = '_blank';
                // 브라우저의 다운로드 관리자로 보내기
            }
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('파일 다운로드 완료:', originalName);
        } catch (error) {
            console.error('파일 다운로드 오류:', error);
            
            // 더 구체적인 오류 메시지 제공
            let errorMessage = '파일 다운로드 중 오류가 발생했습니다.';
            if (error.message.includes('Bucket not found')) {
                errorMessage = 'Storage 버킷이 설정되지 않았습니다. 관리자에게 문의하세요.';
            } else if (error.message.includes('파일을 찾을 수 없습니다')) {
                errorMessage = '파일을 찾을 수 없습니다. 파일이 삭제되었을 수 있습니다.';
            }
            
            this.showNotification(errorMessage, 'error');
        }
    }

    async deleteAttachmentsFromStorage(fileId) {
        if (!isSupabaseConfigured() || !this.currentUser) {
            return; // 오프라인 모드에서는 처리하지 않음
        }

        try {
            // 파일의 모든 첨부파일 경로 가져오기
            const { data: attachments, error } = await supabase
                .from('file_attachments')
                .select('storage_path')
                .eq('file_id', fileId);

            if (error) throw error;

            // 각 파일을 Storage에서 삭제
            for (const attachment of attachments) {
                await SupabaseHelper.deleteStorageFile(attachment.storage_path);
            }
        } catch (error) {
            console.error('첨부파일 삭제 오류:', error);
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            this.showNotification('로그인이 필요합니다.', 'error');
            return;
        }
        
        const title = document.getElementById('fileTitle').value.trim();
        const description = document.getElementById('fileDescription').value.trim();
        const category = document.getElementById('fileCategory').value;
        const tags = document.getElementById('fileTags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
        const fileInput = document.getElementById('fileUpload');
        
        if (!title || !category) {
            alert('제목과 카테고리는 필수 입력 항목입니다.');
            return;
        }

        const fileData = {
            title,
            description,
            category,
            tags,
            files: [] // 첨부파일 임시 저장용 (Supabase 전송시 제외됨)
        };

        // this.selectedFiles 사용 (드래그앤드롭으로 선택한 파일들 포함)
        if (this.selectedFiles && this.selectedFiles.length > 0) {
            let processedFiles = 0;
            Array.from(this.selectedFiles).forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    fileData.files.push({
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        data: e.target.result
                    });
                    
                    processedFiles++;
                    if (processedFiles === this.selectedFiles.length) {
                        this.addFileToSupabase(fileData);
                    }
                };
                reader.readAsDataURL(file);
            });
        } else {
            this.addFileToSupabase(fileData);
        }
    }

    async addFile(fileData) {
        // 호환성을 위해 유지, 실제로는 addFileToSupabase 사용
        await this.addFileToSupabase(fileData);
        this.clearForm();
    }

    // 드래그 앤 드롭 설정
    setupDragAndDrop() {
        const uploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('fileUpload');
        
        // 드래그 이벤트
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files);
            this.handleMultipleFiles(files);
        });
        
        // 클릭 이벤트
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
    }

    handleFileUpload(e) {
        const files = Array.from(e.target.files);
        this.handleMultipleFiles(files);
    }

    handleMultipleFiles(files) {
        this.selectedFiles = files;
        this.updateFilePreview();
    }

    updateFilePreview() {
        const container = document.getElementById('selectedFiles');
        
        if (!this.selectedFiles || this.selectedFiles.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        const totalSize = this.selectedFiles.reduce((sum, file) => sum + file.size, 0);
        
        container.innerHTML = `
            <div class="files-summary">
                📎 선택된 파일: ${this.selectedFiles.length}개 (총 ${this.formatFileSize(totalSize)})
            </div>
            ${this.selectedFiles.map((file, index) => `
                <div class="file-item-preview">
                    <div class="file-info">
                        <div class="file-icon">${this.getFileIcon(file.name)}</div>
                        <div class="file-details">
                            <div class="file-name">${file.name}</div>
                            <div class="file-size">${this.formatFileSize(file.size)}</div>
                        </div>
                    </div>
                    <button type="button" class="file-remove" onclick="fileManager.removeFile(${index})" title="파일 제거">×</button>
                </div>
            `).join('')}
        `;
    }

    getFileIcon(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const iconMap = {
            'pdf': '📄',
            'doc': '📝', 'docx': '📝',
            'xls': '📊', 'xlsx': '📊',
            'ppt': '📽️', 'pptx': '📽️',
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
            'mp4': '🎥', 'avi': '🎥', 'mov': '🎥',
            'mp3': '🎵', 'wav': '🎵',
            'zip': '📦', 'rar': '📦',
            'txt': '📄'
        };
        return iconMap[ext] || '📄';
    }

    removeFile(index) {
        if (this.selectedFiles) {
            this.selectedFiles.splice(index, 1);
            this.updateFilePreview();
            
            // 파일 input 업데이트
            const dt = new DataTransfer();
            this.selectedFiles.forEach(file => dt.items.add(file));
            document.getElementById('fileUpload').files = dt.files;
        }
    }

    createFilesList() {
        const fileGroup = document.querySelector('#fileUpload').closest('.form-group');
        const filesList = document.createElement('div');
        filesList.className = 'files-list';
        fileGroup.appendChild(filesList);
        return filesList;
    }

    removeFileFromInput(index) {
        const fileInput = document.getElementById('fileUpload');
        const dt = new DataTransfer();
        const files = Array.from(fileInput.files);
        
        files.forEach((file, i) => {
            if (i !== index) {
                dt.items.add(file);
            }
        });
        
        fileInput.files = dt.files;
        this.handleFileUpload({ target: fileInput });
    }

    renderFiles() {
        const tbody = document.getElementById('fileList');
        const sortBy = document.getElementById('sortBy').value;
        
        // 검색 및 필터 적용 (메인 페이지와 동일하게)
        const searchTerm = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase().trim() : '';
        const categoryFilter = document.getElementById('categoryFilter') ? document.getElementById('categoryFilter').value : '';
        
        let filteredFiles = [...this.files];
        
        if (searchTerm) {
            filteredFiles = filteredFiles.filter(file => 
                file.title.toLowerCase().includes(searchTerm) ||
                file.description.toLowerCase().includes(searchTerm) ||
                (file.tags && file.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
            );
        }
        
        if (categoryFilter) {
            filteredFiles = filteredFiles.filter(file => file.category === categoryFilter);
        }
        
        // 정렬
        const sortedFiles = filteredFiles.sort((a, b) => {
            switch (sortBy) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'category':
                    return a.category.localeCompare(b.category);
                case 'date':
                default:
                    return new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt);
            }
        });

        this.allFiles = sortedFiles;
        this.updatePagination();
        
        if (sortedFiles.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="6">📂 조건에 맞는 자료가 없습니다.</td>
                </tr>
            `;
            return;
        }

        // 페이지네이션 적용
        const itemsPerPage = 10;
        const currentPage = this.currentPage || 1;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedFiles = sortedFiles.slice(startIndex, endIndex);

        tbody.innerHTML = paginatedFiles.map((file, index) => 
            this.createFileRowHTML(file, startIndex + index + 1)
        ).join('');
    }

    createFileRowHTML(file, rowNumber) {
        const createdDate = new Date(file.created_at || file.createdAt).toLocaleDateString('ko-KR');
        const hasAttachments = file.files && file.files.length > 0;
        
        return `
            <tr data-id="${file.id}">
                <td class="col-no">${rowNumber}</td>
                <td class="col-category">
                    <span class="category-badge category-${file.category}">${file.category}</span>
                </td>
                <td class="col-title">
                    <div class="board-title" onclick="fileManager.viewFile('${file.id}')">
                        ${this.escapeHtml(file.title)}
                        ${file.description ? `<br><small style="color: #6b7280; font-weight: normal;">${this.escapeHtml(file.description.substring(0, 80))}${file.description.length > 80 ? '...' : ''}</small>` : ''}
                        ${file.tags && file.tags.length > 0 ? 
                            `<br><div style="margin-top: 4px;">${file.tags.map(tag => `<span style="display: inline-block; background: #e5e7eb; color: #374151; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem; margin-right: 4px;">#${this.escapeHtml(tag)}</span>`).join('')}</div>` : ''
                        }
                    </div>
                </td>
                <td class="col-attachment">
                    ${hasAttachments ? 
                        `<div class="attachment-icons">${file.files.map((f, index) => 
                            `<div class="attachment-file-item" onclick="fileManager.downloadSingleFile('${file.id}', ${index})" title="클릭하여 다운로드">
                                <span class="attachment-file-icon">${this.getFileIcon(f.name || f.original_name || 'unknown')}</span>
                                <div class="attachment-file-info">
                                    <div class="attachment-file-name">${this.escapeHtml(f.name || f.original_name || '파일')}</div>
                                    <div class="attachment-file-size">${this.formatFileSize(f.size || 0)}</div>
                                </div>
                            </div>`
                        ).join('')}</div>` : 
                        `<span class="no-attachment">-</span>`
                    }
                </td>
                <td class="col-date">${createdDate}</td>
                <td class="col-actions">
                    <div class="action-buttons">
                        <button class="action-btn btn-edit" onclick="fileManager.editFile('${file.id}')" title="수정">✏️</button>
                        <button class="action-btn btn-delete" onclick="fileManager.deleteFile('${file.id}')" title="삭제">🗑️</button>
                        ${hasAttachments ? 
                            `<button class="action-btn btn-download" onclick="fileManager.downloadFiles('${file.id}')" title="다운로드">📥</button>` : ''
                        }
                    </div>
                </td>
            </tr>
        `;
    }

    createFileHTML(file) {
        const createdDate = new Date(file.created_at || file.createdAt).toLocaleDateString('ko-KR');
        const updatedDate = new Date(file.updated_at || file.updatedAt).toLocaleDateString('ko-KR');
        const tagsHTML = file.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        const filesHTML = file.files.length > 0 ? 
            `<div class="file-attachments">
                <strong>첨부파일 (${file.files.length}개):</strong>
                ${file.files.map(f => `<span class="file-name">${this.getFileIcon(f.name || f.original_name || 'unknown')} ${f.name || f.original_name || '파일'}</span>`).join(', ')}
            </div>` : '';

        return `
            <div class="file-item" data-id="${file.id}">
                <div class="file-header">
                    <div>
                        <div class="file-title">${this.escapeHtml(file.title)}</div>
                        <div class="file-meta">
                            <span class="category-badge">${file.category}</span>
                            <span>📅 생성: ${createdDate}</span>
                            ${createdDate !== updatedDate ? `<span>✏️ 수정: ${updatedDate}</span>` : ''}
                        </div>
                    </div>
                </div>
                
                ${file.description ? `<div class="file-description">${this.escapeHtml(file.description)}</div>` : ''}
                
                ${file.tags.length > 0 ? `<div class="file-tags">${tagsHTML}</div>` : ''}
                
                ${filesHTML}
                
                <div class="file-actions">
                    ${!file.isReadOnly && this.currentUser ? `
                        <button class="edit-btn" onclick="fileManager.editFile('${file.id}')">✏️ 수정</button>
                        <button class="delete-btn" onclick="fileManager.deleteFile('${file.id}')">🗑️ 삭제</button>
                    ` : ''}
                    ${file.files.length > 0 ? `<button class="download-btn" onclick="fileManager.downloadFiles('${file.id}')" title="클릭: 기본 다운로드 폴더로 저장&#10;Ctrl+클릭: 저장 위치 선택">💾 다운로드</button>` : ''}
                    ${file.isReadOnly ? `<span class="read-only-badge">👁️ 읽기 전용</span>` : ''}
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 페이지네이션 관련 함수들
    updatePagination() {
        const totalPages = Math.max(1, Math.ceil(this.allFiles.length / 10));
        const pagination = document.getElementById('pagination');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const pageInfo = document.getElementById('pageInfo');
        
        // 항상 페이지네이션을 표시
        if (pagination) pagination.style.display = 'flex';
        
        // 페이지 버튼 상태 업데이트
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages || this.allFiles.length === 0;
        
        // 페이지 정보 표시 (아이템이 없어도 1/1로 표시)
        const displayTotalPages = this.allFiles.length === 0 ? 1 : totalPages;
        const displayCurrentPage = this.allFiles.length === 0 ? 1 : this.currentPage;
        if (pageInfo) pageInfo.textContent = `${displayCurrentPage} / ${displayTotalPages}`;
    }

    goToPrevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderFiles();
        }
    }

    goToNextPage() {
        const totalFiles = this.allFiles.length;
        const itemsPerPage = 10;
        const totalPages = Math.ceil(totalFiles / itemsPerPage);
        
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderFiles();
        }
    }

    // 파일 상세보기 (제목 클릭 시)
    viewFile(id) {
        const file = this.files.find(f => f.id === id);
        if (!file) return;

        this.showDetailView(file);
    }

    showDetailView(file) {
        // 메인 컨테이너 숨기기
        const container = document.querySelector('.container');
        container.style.display = 'none';
        
        // 상세보기 컨테이너 생성
        const detailContainer = document.createElement('div');
        detailContainer.className = 'detail-container';
        detailContainer.id = 'detailContainer';
        
        const createdDate = new Date(file.created_at || file.createdAt).toLocaleDateString('ko-KR');
        const updatedDate = new Date(file.updated_at || file.updatedAt).toLocaleDateString('ko-KR');
        
        detailContainer.innerHTML = `
            <div class="container">
                <header>
                    <h1>📋 자료 상세보기</h1>
                    <p>등록된 자료의 상세 정보를 확인하고 관리하세요</p>
                </header>

                <div class="detail-section">
                    <div class="detail-header">
                        <h2>📄 ${this.escapeHtml(file.title)}</h2>
                        <div class="detail-actions">
                            <button class="edit-detail-btn" onclick="fileManager.editFileFromDetail('${file.id}')" title="수정">
                                ✏️ 수정
                            </button>
                            <button class="delete-detail-btn" onclick="fileManager.deleteFileFromDetail('${file.id}')" title="삭제">
                                🗑️ 삭제
                            </button>
                            <button class="back-btn" onclick="fileManager.hideDetailView()">
                                ← 목록으로 돌아가기
                            </button>
                        </div>
                    </div>
                    
                    <div class="detail-content">
                        <div class="detail-info">
                            <div class="info-group">
                                <label>📂 카테고리</label>
                                <div class="info-value">
                                    <span class="category-badge category-${file.category}">${file.category}</span>
                                </div>
                            </div>
                            
                            <div class="info-group">
                                <label>📝 설명</label>
                                <div class="info-value description">
                                    ${file.description ? this.escapeHtml(file.description) : '설명이 없습니다.'}
                                </div>
                            </div>
                            
                            ${file.tags && file.tags.length > 0 ? `
                            <div class="info-group">
                                <label>🏷️ 태그</label>
                                <div class="info-value">
                                    <div class="tags-container">
                                        ${file.tags.map(tag => `<span class="tag">#${this.escapeHtml(tag)}</span>`).join('')}
                                    </div>
                                </div>
                            </div>` : ''}
                            
                            ${file.files && file.files.length > 0 ? `
                            <div class="info-group">
                                <label>📎 첨부파일 (${file.files.length}개)</label>
                                <div class="info-value">
                                    <div class="attachments-list">
                                        ${file.files.map((f, index) => `
                                            <div class="attachment-item">
                                                <span class="attachment-icon">${this.getFileIcon(f.name || f.original_name || 'unknown')}</span>
                                                <span class="attachment-name">${this.escapeHtml(f.name || f.original_name || '파일')}</span>
                                                <button class="download-single-btn" onclick="fileManager.downloadSingleFile('${file.id}', ${index})" title="다운로드">
                                                    📥 다운로드
                                                </button>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <div class="attachment-actions">
                                        <button class="download-all-btn" onclick="fileManager.downloadFiles('${file.id}')" title="모든 파일 다운로드">
                                            📦 모든 파일 다운로드
                                        </button>
                                    </div>
                                </div>
                            </div>` : `
                            <div class="info-group">
                                <label>📎 첨부파일</label>
                                <div class="info-value no-files">
                                    첨부된 파일이 없습니다.
                                </div>
                            </div>`}
                            
                            <div class="info-group">
                                <label>📅 등록일</label>
                                <div class="info-value">${createdDate}</div>
                            </div>
                            
                            ${createdDate !== updatedDate ? `
                            <div class="info-group">
                                <label>🔄 수정일</label>
                                <div class="info-value">${updatedDate}</div>
                            </div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(detailContainer);
    }

    hideDetailView() {
        const detailContainer = document.getElementById('detailContainer');
        if (detailContainer) {
            detailContainer.remove();
        }
        
        // 메인 컨테이너 다시 보이기
        const container = document.querySelector('.container');
        container.style.display = 'block';
    }

    editFileFromDetail(id) {
        this.hideDetailView();
        this.editFile(id);
    }

    async deleteFileFromDetail(id) {
        if (confirm('정말로 이 자료를 삭제하시겠습니까?')) {
            await this.deleteFile(id);
            this.hideDetailView();
        }
    }

    editFile(id) {
        if (!this.currentUser) {
            this.showNotification('로그인이 필요합니다.', 'error');
            return;
        }

        const file = this.files.find(f => f.id === id);
        if (!file) return;

        if (file.isReadOnly) {
            this.showNotification('읽기 전용 파일은 편집할 수 없습니다.', 'error');
            return;
        }

        this.currentEditId = id;
        
        document.getElementById('editTitle').value = file.title;
        document.getElementById('editDescription').value = file.description;
        document.getElementById('editCategory').value = file.category;
        document.getElementById('editTags').value = file.tags.join(', ');
        
        document.getElementById('editModal').style.display = 'block';
    }

    handleEditSubmit(e) {
        e.preventDefault();
        
        if (!this.currentEditId) return;
        
        const title = document.getElementById('editTitle').value.trim();
        const description = document.getElementById('editDescription').value.trim();
        const category = document.getElementById('editCategory').value;
        const tags = document.getElementById('editTags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
        
        if (!title || !category) {
            alert('제목과 카테고리는 필수 입력 항목입니다.');
            return;
        }

        const updates = {
            title,
            description,
            category,
            tags
        };

        this.updateFileInSupabase(this.currentEditId, updates);
        this.closeEditModal();
    }

    closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
        this.currentEditId = null;
    }

    deleteFile(id) {
        if (!this.currentUser) {
            this.showNotification('로그인이 필요합니다.', 'error');
            return;
        }

        const file = this.files.find(f => f.id === id);
        if (!file) return;

        if (file.isReadOnly) {
            this.showNotification('읽기 전용 파일은 삭제할 수 없습니다.', 'error');
            return;
        }

        if (confirm(`"${file.title}" 자료를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
            this.deleteFileFromSupabase(id);
        }
    }

    async downloadFiles(id) {
        const file = this.files.find(f => f.id === id);
        if (!file || file.files.length === 0) return;

        try {
            if (file.files.length === 1) {
                // 단일 파일: 직접 다운로드
                await this.downloadSingleFileData(file.files[0]);
                const fileName = file.files[0].original_name || file.files[0].name;
                this.showNotification(`파일 다운로드 완료: ${fileName}`, 'success');
            } else {
                // 다중 파일: ZIP으로 압축하여 다운로드
                await this.downloadFilesAsZip(file);
            }
        } catch (error) {
            console.error('파일 다운로드 오류:', error);
            this.showNotification('파일 다운로드 중 오류가 발생했습니다.', 'error');
        }
    }

    async downloadSingleFile(fileId, fileIndex) {
        const file = this.files.find(f => f.id === fileId);
        if (!file || !file.files[fileIndex]) return;

        try {
            const fileData = file.files[fileIndex];
            await this.downloadSingleFileData(fileData);
            const fileName = fileData.original_name || fileData.name;
            this.showNotification(`파일 다운로드 완료: ${fileName}`, 'success');
        } catch (error) {
            console.error('개별 파일 다운로드 오류:', error);
            this.showNotification('파일 다운로드 중 오류가 발생했습니다.', 'error');
        }
    }

    async downloadSingleFileData(fileData) {
        if (fileData.storage_path && isSupabaseConfigured()) {
            // Supabase Storage에서 다운로드
            await this.downloadFileFromStorage(fileData.storage_path, fileData.original_name || fileData.name);
        } else if (fileData.data) {
            // localStorage 데이터 다운로드 (base64)
            const link = document.createElement('a');
            link.href = fileData.data;
            link.download = fileData.name || fileData.original_name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    async downloadFilesAsZip(file) {
        const zip = new JSZip();
        const fileTitle = file.title.replace(/[<>:"/\\|?*]/g, '_'); // 파일명에 부적절한 문자 제거
        
        for (const fileData of file.files) {
            try {
                let fileContent;
                const fileName = fileData.original_name || fileData.name || 'file';
                
                if (fileData.storage_path && isSupabaseConfigured()) {
                    // Supabase Storage에서 파일 가져오기
                    const response = await fetch(await SupabaseHelper.getFileUrl(fileData.storage_path));
                    fileContent = await response.blob();
                } else if (fileData.data) {
                    // localStorage의 base64 데이터 변환
                    const response = await fetch(fileData.data);
                    fileContent = await response.blob();
                }
                
                if (fileContent) {
                    zip.file(fileName, fileContent);
                }
            } catch (error) {
                console.error(`파일 ${fileData.name} 처리 오류:`, error);
            }
        }
        
        // ZIP 파일 생성 및 다운로드
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `${fileTitle}_첨부파일.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        this.showNotification(`ZIP 파일 다운로드 완료: ${fileTitle}_첨부파일.zip (${file.files.length}개 파일)`, 'success');
    }

    handleSearch() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        const categoryFilter = document.getElementById('categoryFilter').value;
        
        // 검색 시 첫 페이지로 리셋
        this.currentPage = 1;
        this.renderFiles();
    }


    clearForm() {
        document.getElementById('fileForm').reset();
        const filesList = document.querySelector('.files-list');
        if (filesList) {
            filesList.innerHTML = '';
        }
        // 선택된 파일들과 미리보기 초기화
        this.selectedFiles = [];
        const selectedFilesContainer = document.getElementById('selectedFiles');
        if (selectedFilesContainer) {
            selectedFilesContainer.innerHTML = '';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateEmptyState() {
        const container = document.getElementById('fileList');
        if (this.files.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>📂 등록된 자료가 없습니다. 새 자료를 추가해보세요!</p></div>';
        }
    }

    showNotification(message, type = 'info') {
        // 기존 알림이 있으면 제거
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 3초 후 자동 제거
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    loadFiles() {
        try {
            const stored = localStorage.getItem('fileManagerData');
            const files = stored ? JSON.parse(stored) : [];
            
            // 기존 localStorage 데이터의 호환성을 위해 컬럼명 변환
            return files.map(file => ({
                ...file,
                created_at: file.created_at || file.createdAt || new Date().toISOString(),
                updated_at: file.updated_at || file.updatedAt || new Date().toISOString()
            }));
        } catch (error) {
            console.error('파일 데이터를 불러오는 중 오류가 발생했습니다:', error);
            return [];
        }
    }

    saveFiles() {
        try {
            localStorage.setItem('fileManagerData', JSON.stringify(this.files));
        } catch (error) {
            console.error('파일 데이터를 저장하는 중 오류가 발생했습니다:', error);
            alert('데이터 저장 중 오류가 발생했습니다. 브라우저의 저장공간을 확인해주세요.');
        }
    }

    exportData() {
        const dataStr = JSON.stringify(this.files, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `자료실_백업_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.showNotification('데이터가 성공적으로 내보내기되었습니다!', 'success');
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (Array.isArray(importedData)) {
                    if (confirm('기존 데이터를 모두 삭제하고 새 데이터를 가져오시겠습니까?')) {
                        this.files = importedData;
                        this.saveFiles();
                        this.renderFiles();
                        this.updateEmptyState();
                        this.showNotification('데이터가 성공적으로 가져와졌습니다!', 'success');
                    }
                } else {
                    alert('올바르지 않은 파일 형식입니다.');
                }
            } catch (error) {
                alert('파일을 읽는 중 오류가 발생했습니다.');
                console.error(error);
            }
        };
        reader.readAsText(file);
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

const fileManager = new FileManager();

document.addEventListener('DOMContentLoaded', () => {
    console.log('📚 자료실 관리 시스템이 초기화되었습니다.');
});