class FileManager {
    constructor() {
        this.files = [];
        this.currentEditId = null;
        this.currentUser = null;
        this.isOnline = navigator.onLine;
        this.realtimeSubscription = null;
        this.authMode = 'login'; // 'login' or 'signup'
        
        this.init();
    }

    async init() {
        // Supabase 초기화
        const supabaseInitialized = initializeSupabase();
        
        if (supabaseInitialized) {
            console.log('✅ Supabase 모드로 실행합니다.');
            await this.initializeAuth();
        } else {
            console.log('⚠️ 오프라인 모드로 실행합니다.');
            this.files = this.loadFiles();
            this.showOfflineMode();
        }
        
        this.bindEvents();
        this.renderFiles();
        this.updateEmptyState();
        this.setupOnlineStatusListener();
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

        // 인증 이벤트
        document.getElementById('loginBtn').addEventListener('click', () => this.openAuthModal('login'));
        document.getElementById('signupBtn').addEventListener('click', () => this.openAuthModal('signup'));
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        document.getElementById('authForm').addEventListener('submit', (e) => this.handleAuthSubmit(e));
        document.getElementById('authCancelBtn').addEventListener('click', () => this.closeAuthModal());
        document.getElementById('authSwitchLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleAuthMode();
        });

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

    // 오프라인 모드 관련
    showOfflineMode() {
        const container = document.querySelector('.container');
        const offlineNotice = document.createElement('div');
        offlineNotice.className = 'offline-mode';
        offlineNotice.innerHTML = '⚠️ 오프라인 모드: 로컬 저장소를 사용합니다. Supabase 설정을 확인해주세요.';
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
                <span>👤 게스트 모드 - 파일 보기 및 다운로드만 가능합니다</span>
                <button onclick="fileManager.openAuthModal('login')" class="guest-login-btn">🔑 로그인하여 편집하기</button>
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
        this.files.push(fileData);
        this.saveFiles();
        this.renderFiles();
        this.updateEmptyState();
        this.showNotification('새 자료가 성공적으로 추가되었습니다! (로컬 저장)', 'success');
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
                    
                    // 파일 경로 생성 (사용자별/파일ID별 폴더 구조)
                    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${attachment.name}`;
                    const filePath = `${this.currentUser.id}/${fileId}/${fileName}`;
                    
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
            const url = await SupabaseHelper.getFileUrl(filePath);
            
            // 다운로드 링크 생성
            const link = document.createElement('a');
            link.href = url;
            link.download = originalName;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('파일 다운로드 오류:', error);
            this.showNotification('파일 다운로드 중 오류가 발생했습니다.', 'error');
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
            id: this.generateId(),
            title,
            description,
            category,
            tags,
            files: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (fileInput.files.length > 0) {
            Array.from(fileInput.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    fileData.files.push({
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        data: e.target.result
                    });
                    
                    if (fileData.files.length === fileInput.files.length) {
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

    handleFileUpload(e) {
        const files = Array.from(e.target.files);
        const filesList = document.querySelector('.files-list') || this.createFilesList();
        
        filesList.innerHTML = '';
        
        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-attachment';
            fileItem.innerHTML = `
                <span>📎 ${file.name} (${this.formatFileSize(file.size)})</span>
                <button type="button" class="remove-file" onclick="fileManager.removeFileFromInput(${index})">제거</button>
            `;
            filesList.appendChild(fileItem);
        });
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
        const container = document.getElementById('fileList');
        const sortBy = document.getElementById('sortBy').value;
        
        let sortedFiles = [...this.files];
        
        switch (sortBy) {
            case 'title':
                sortedFiles.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'category':
                sortedFiles.sort((a, b) => a.category.localeCompare(b.category));
                break;
            case 'date':
            default:
                sortedFiles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
        }

        if (sortedFiles.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>📂 등록된 자료가 없습니다. 새 자료를 추가해보세요!</p></div>';
            return;
        }

        container.innerHTML = sortedFiles.map(file => this.createFileHTML(file)).join('');
    }

    createFileHTML(file) {
        const createdDate = new Date(file.createdAt).toLocaleDateString('ko-KR');
        const updatedDate = new Date(file.updatedAt).toLocaleDateString('ko-KR');
        const tagsHTML = file.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        const filesHTML = file.files.length > 0 ? 
            `<div class="file-attachments">
                <strong>첨부파일 (${file.files.length}개):</strong>
                ${file.files.map(f => `<span class="file-name">📎 ${f.name}</span>`).join(', ')}
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
                    ${file.files.length > 0 ? `<button class="download-btn" onclick="fileManager.downloadFiles('${file.id}')">💾 다운로드</button>` : ''}
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
            for (const fileData of file.files) {
                if (fileData.storage_path && isSupabaseConfigured()) {
                    // Supabase Storage에서 다운로드
                    await this.downloadFileFromStorage(fileData.storage_path, fileData.original_name || fileData.name);
                } else if (fileData.data) {
                    // localStorage 데이터 다운로드 (base64)
                    const link = document.createElement('a');
                    link.href = fileData.data;
                    link.download = fileData.name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            }
            this.showNotification(`${file.files.length}개의 파일이 다운로드되었습니다!`, 'success');
        } catch (error) {
            console.error('파일 다운로드 오류:', error);
            this.showNotification('파일 다운로드 중 오류가 발생했습니다.', 'error');
        }
    }

    handleSearch() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        const categoryFilter = document.getElementById('categoryFilter').value;
        
        let filteredFiles = this.files;
        
        if (searchTerm) {
            filteredFiles = filteredFiles.filter(file => 
                file.title.toLowerCase().includes(searchTerm) ||
                file.description.toLowerCase().includes(searchTerm) ||
                file.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            );
        }
        
        if (categoryFilter) {
            filteredFiles = filteredFiles.filter(file => file.category === categoryFilter);
        }
        
        this.renderFilteredFiles(filteredFiles);
    }

    renderFilteredFiles(files) {
        const container = document.getElementById('fileList');
        const sortBy = document.getElementById('sortBy').value;
        
        let sortedFiles = [...files];
        
        switch (sortBy) {
            case 'title':
                sortedFiles.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'category':
                sortedFiles.sort((a, b) => a.category.localeCompare(b.category));
                break;
            case 'date':
            default:
                sortedFiles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
        }

        if (sortedFiles.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>🔍 검색 결과가 없습니다. 다른 키워드로 검색해보세요!</p></div>';
            return;
        }

        container.innerHTML = sortedFiles.map(file => this.createFileHTML(file)).join('');
    }

    clearForm() {
        document.getElementById('fileForm').reset();
        const filesList = document.querySelector('.files-list');
        if (filesList) {
            filesList.innerHTML = '';
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
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#48bb78' : '#667eea'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1001;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    loadFiles() {
        try {
            const stored = localStorage.getItem('fileManagerData');
            return stored ? JSON.parse(stored) : [];
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