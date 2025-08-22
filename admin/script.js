class AdminFileManager {
    constructor() {
        this.files = [];
        this.categories = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filteredFiles = [];
        this.currentEditId = null;
        this.currentEditCategoryId = null;
        this.currentUser = null;
        this.isLoggedIn = false;
        
        this.init();
    }

    async init() {
        console.log('🔍 Admin FileManager 초기화 시작');
        
        try {
            this.bindEvents();
            await this.checkSession();
            this.updateUI();
        } catch (error) {
            console.error('초기화 오류:', error);
            this.showNotification('초기화 중 오류가 발생했습니다.', 'error');
        }
    }

    bindEvents() {
        // 로그인 이벤트
        const loginBtn = document.getElementById('loginBtn');
        const adminPassword = document.getElementById('adminPassword');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        }
        
        if (adminPassword) {
            adminPassword.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }

        // 로그아웃 이벤트
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // 검색 및 정렬 이벤트
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');
        const sortBy = document.getElementById('sortBy');
        
        if (searchBtn) searchBtn.addEventListener('click', () => this.handleSearch());
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') this.handleSearch();
            });
        }
        if (categoryFilter) categoryFilter.addEventListener('change', () => this.handleSearch());
        if (sortBy) sortBy.addEventListener('change', () => this.handleSearch());

        // 탭 전환 이벤트
        this.bindTabEvents();
        
        // 파일 관리 이벤트
        this.bindFileEvents();
        
        // 카테고리 관리 이벤트
        this.bindCategoryEvents();
        
        // 페이지네이션 이벤트
        this.bindPaginationEvents();
    }

    bindTabEvents() {
        const fileTabBtn = document.getElementById('fileTabBtn');
        const categoryTabBtn = document.getElementById('categoryTabBtn');
        const fileTab = document.getElementById('fileTab');
        const categoryTab = document.getElementById('categoryTab');

        if (fileTabBtn && categoryTabBtn && fileTab && categoryTab) {
            fileTabBtn.addEventListener('click', () => {
                // 탭 버튼 활성화 상태 변경
                fileTabBtn.classList.add('active');
                categoryTabBtn.classList.remove('active');
                
                // 탭 컨텐츠 표시/숨김
                fileTab.classList.add('active');
                categoryTab.classList.remove('active');
            });

            categoryTabBtn.addEventListener('click', () => {
                // 탭 버튼 활성화 상태 변경
                categoryTabBtn.classList.add('active');
                fileTabBtn.classList.remove('active');
                
                // 탭 컨텐츠 표시/숨김
                categoryTab.classList.add('active');
                fileTab.classList.remove('active');
                
                // 카테고리 목록 렌더링
                this.renderCategoryList();
            });
        }
    }

    bindCategoryEvents() {
        // 카테고리 추가 폼
        const categoryForm = document.getElementById('categoryForm');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddCategory();
            });
        }

        // 카테고리 취소 버튼
        const cancelCategoryBtn = document.getElementById('cancelCategoryBtn');
        if (cancelCategoryBtn) {
            cancelCategoryBtn.addEventListener('click', () => this.resetCategoryForm());
        }

        // 모달 이벤트
        this.bindModalEvents();
    }

    bindModalEvents() {
        // 수정 모달 닫기
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                document.getElementById('editModal').style.display = 'none';
            });
        }

        // 카테고리 수정 모달 닫기
        const closeCategoryModal = document.getElementById('closeCategoryModal');
        if (closeCategoryModal) {
            closeCategoryModal.addEventListener('click', () => {
                document.getElementById('editCategoryModal').style.display = 'none';
            });
        }

        // 수정 폼 제출
        const editForm = document.getElementById('editForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUpdateFile();
            });
        }

        // 카테고리 수정 폼 제출
        const editCategoryForm = document.getElementById('editCategoryForm');
        if (editCategoryForm) {
            editCategoryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUpdateCategory();
            });
        }
    }

    bindFileEvents() {
        // 파일 추가 폼
        const fileForm = document.getElementById('fileForm');
        if (fileForm) {
            fileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddFile();
            });
        }

        // 취소 버튼
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.resetForm());
        }

        // 파일 업로드 영역
        this.setupFileUpload();
    }
    
    bindEditModalEvents() {
        console.log('bindEditModalEvents 호출됨, 이미 바인딩된 상태:', this.editModalEventsBound);
        
        // 이벤트가 이미 바인딩되었는지 확인
        if (this.editModalEventsBound) {
            console.log('이미 바인딩됨, 스킵');
            return;
        }
        
        // 기존 이벤트 리스너 제거 (중복 방지)
        const editForm = document.getElementById('editForm');
        if (editForm && this.editFormHandler) {
            editForm.removeEventListener('submit', this.editFormHandler);
        }
        
        // 수정 폼 제출 이벤트 핸들러 생성 및 바인딩
        this.editFormHandler = (e) => {
            e.preventDefault();
            console.log('editForm 제출됨');
            
            // 중복 실행 방지
            if (this.isUpdating) {
                console.log('이미 업데이트 중입니다.');
                return;
            }
            
            this.handleUpdateFile();
        };
        
        if (editForm) {
            console.log('editForm 이벤트 바인딩');
            editForm.addEventListener('submit', this.editFormHandler);
        }
        
        // 수정 모달 닫기
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            console.log('closeModal 이벤트 바인딩');
            closeModal.addEventListener('click', () => {
                console.log('closeModal 클릭됨');
                document.getElementById('editModal').style.display = 'none';
                this.currentEditId = null;
                this.filesToDelete = [];
                
                // 새 파일 미리보기 초기화
                this.updateNewFilesPreview([]);
                const newAttachmentsInput = document.getElementById('newAttachments');
                if (newAttachmentsInput) {
                    newAttachmentsInput.value = '';
                }
            });
        }
        
        // 파일 선택 버튼과 드래그&드롭 영역
        const fileSelectBtn = document.getElementById('fileSelectBtn');
        const fileInput = document.getElementById('newAttachments');
        const dropZone = document.getElementById('fileDropZone');
        
        if (fileSelectBtn && fileInput && dropZone) {
            console.log('새로운 파일 선택 인터페이스 이벤트 바인딩');
            
            // 파일 선택 버튼 클릭 이벤트
            fileSelectBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('파일 선택 버튼 클릭됨');
                fileInput.click();
            });
            
            // 드롭존 클릭 이벤트
            dropZone.addEventListener('click', (e) => {
                if (e.target === dropZone || e.target.closest('.drop-zone-content')) {
                    fileInput.click();
                }
            });
            
            // 파일 입력 변경 이벤트
            fileInput.addEventListener('change', (e) => {
                console.log('파일 선택됨, 개수:', e.target.files.length);
                this.updateNewFilesPreview(e.target.files);
            });
            
            // 드래그&드롭 이벤트 바인딩
            this.bindDragAndDropEvents(dropZone, fileInput);
            
        } else {
            console.error('새로운 파일 선택 요소들을 찾을 수 없음:', {
                fileSelectBtn: !!fileSelectBtn,
                fileInput: !!fileInput, 
                dropZone: !!dropZone
            });
        }
        
        // 바인딩 완료 플래그 설정
        this.editModalEventsBound = true;
        console.log('이벤트 바인딩 완료');
    }
    
    // 드래그&드롭 이벤트 바인딩
    bindDragAndDropEvents(dropZone, fileInput) {
        console.log('드래그&드롭 이벤트 바인딩 시작');
        
        // 드래그 진입
        dropZone.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });
        
        // 드래그 오버
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });
        
        // 드래그 나감
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 완전히 벗어났을 때만 클래스 제거
            if (!dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('dragover');
            }
        });
        
        // 파일 드롭
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            console.log('파일 드롭됨, 개수:', files.length);
            
            if (files.length > 0) {
                // 파일 입력에 드롭된 파일들 설정
                fileInput.files = files;
                this.updateNewFilesPreview(files);
            }
        });
        
        console.log('드래그&드롭 이벤트 바인딩 완료');
    }
    
    // 새로운 파일 미리보기 업데이트
    updateNewFilesPreview(files) {
        const previewContainer = document.getElementById('newFilesPreview');
        
        if (!files || files.length === 0) {
            previewContainer.classList.remove('show');
            previewContainer.innerHTML = '';
            return;
        }
        
        previewContainer.classList.add('show');
        previewContainer.innerHTML = '';
        
        Array.from(files).forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'preview-file-item';
            
            const fileIcon = this.getFileIcon(file.name);
            const fileSize = this.formatFileSize(file.size);
            
            fileItem.innerHTML = `
                <div class="preview-file-info">
                    <div class="preview-file-icon">${fileIcon}</div>
                    <div class="preview-file-details">
                        <div class="preview-file-name" title="${this.escapeHtml(file.name)}">
                            ${this.escapeHtml(file.name)}
                        </div>
                        <div class="preview-file-size">${fileSize}</div>
                    </div>
                </div>
                <button type="button" class="preview-file-remove" data-index="${index}">
                    ✕ 제거
                </button>
            `;
            
            // 제거 버튼 이벤트
            const removeBtn = fileItem.querySelector('.preview-file-remove');
            removeBtn.addEventListener('click', () => {
                this.removeFileFromPreview(index);
            });
            
            previewContainer.appendChild(fileItem);
        });
    }
    
    // 파일 미리보기에서 제거
    removeFileFromPreview(indexToRemove) {
        const fileInput = document.getElementById('newAttachments');
        const dt = new DataTransfer();
        
        Array.from(fileInput.files).forEach((file, index) => {
            if (index !== indexToRemove) {
                dt.items.add(file);
            }
        });
        
        fileInput.files = dt.files;
        this.updateNewFilesPreview(fileInput.files);
    }
    
    // 새 첨부파일 미리보기 표시 (기존 함수 - 호환성 유지)
    showAttachmentPreview(files) {
        const container = document.querySelector('.attachment-preview');
        
        if (!container) {
            // 미리보기 컨테이너가 없으면 생성
            const previewDiv = document.createElement('div');
            previewDiv.className = 'attachment-preview';
            document.querySelector('.new-attachment-section').appendChild(previewDiv);
        }
        
        const preview = document.querySelector('.attachment-preview');
        
        if (files.length === 0) {
            preview.style.display = 'none';
            return;
        }
        
        let previewText = `선택된 파일 (${files.length}개): `;
        const fileNames = Array.from(files).map(file => file.name).slice(0, 3);
        if (files.length > 3) {
            fileNames.push(`외 ${files.length - 3}개`);
        }
        previewText += fileNames.join(', ');
        
        preview.innerHTML = previewText;
        preview.style.display = 'block';
    }

    bindPaginationEvents() {
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        if (prevBtn) prevBtn.addEventListener('click', () => this.goToPrevPage());
        if (nextBtn) nextBtn.addEventListener('click', () => this.goToNextPage());
    }

    setupFileUpload() {
        const fileUploadArea = document.getElementById('fileUploadArea');
        const fileUpload = document.getElementById('fileUpload');
        
        if (fileUploadArea && fileUpload) {
            // 클릭으로 파일 선택
            fileUploadArea.addEventListener('click', () => {
                fileUpload.click();
            });

            // 파일 선택 시 미리보기
            fileUpload.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files);
            });

            // 드래그 앤 드롭
            fileUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileUploadArea.classList.add('drag-over');
            });

            fileUploadArea.addEventListener('dragleave', () => {
                fileUploadArea.classList.remove('drag-over');
            });

            fileUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                fileUploadArea.classList.remove('drag-over');
                this.handleFileSelection(e.dataTransfer.files);
            });
        }
    }

    async checkSession() {
        try {
            const response = await fetch('/api/auth/session', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    this.currentUser = data.user;
                    this.isLoggedIn = true;
                    await this.loadData();
                }
            }
        } catch (error) {
            console.log('세션 확인 실패:', error);
        }
    }

    async handleLogin() {
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;
        const loginBtn = document.getElementById('loginBtn');

        if (!email || !password) {
            this.showNotification('이메일과 비밀번호를 입력해주세요.', 'error');
            return;
        }

        try {
            loginBtn.disabled = true;
            loginBtn.textContent = '로그인 중...';

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user || data.data || null;
                this.isLoggedIn = true;
                this.showNotification('로그인되었습니다!', 'success');
                
                await this.loadData();
                this.updateUI();
            } else {
                throw new Error(data.error || data.message || '로그인에 실패했습니다.');
            }
        } catch (error) {
            console.error('로그인 오류:', error);
            this.showNotification(error.message || '로그인 중 오류가 발생했습니다.', 'error');
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = '로그인';
        }
    }

    async handleLogout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
            
            this.currentUser = null;
            this.isLoggedIn = false;
            this.files = [];
            this.categories = [];
            
            this.showNotification('로그아웃되었습니다.', 'info');
            this.updateUI();
            
            // 폼 초기화
            document.getElementById('adminPassword').value = '';
        } catch (error) {
            console.error('로그아웃 오류:', error);
            this.showNotification('로그아웃 중 오류가 발생했습니다.', 'error');
        }
    }

    async loadData() {
        if (!this.isLoggedIn) return;

        try {
            // 파일 목록 로드
            const filesData = await window.AdminAPI.Files.getAll();
            this.files = filesData.data || [];
            console.log('파일 로드 완료:', this.files.length, '개');

            // 카테고리 목록 로드
            const categoriesData = await window.AdminAPI.Categories.getAll();
            this.categories = categoriesData.data || [];
            console.log('카테고리 로드 완료:', this.categories.length, '개');
            console.log('카테고리 데이터:', this.categories);

            this.filteredFiles = [...this.files];
            this.renderFiles();
            this.updatePagination();
            this.updateCategoryOptions();
            
        } catch (error) {
            console.error('데이터 로드 오류:', error);
            this.showNotification('데이터 로드 중 오류가 발생했습니다.', 'error');
        }
    }

    updateUI() {
        const loginSection = document.getElementById('loginSection');
        const adminSection = document.getElementById('adminSection');
        const adminPanel = document.getElementById('adminPanel');
        const adminUserEmail = document.getElementById('adminUserEmail');

        if (this.isLoggedIn) {
            // 로그인 상태
            if (loginSection) loginSection.style.display = 'none';
            if (adminSection) adminSection.style.display = 'flex';
            if (adminPanel) adminPanel.style.display = 'block';
            if (adminUserEmail) adminUserEmail.textContent = this.currentUser.email;
        } else {
            // 로그아웃 상태
            if (loginSection) loginSection.style.display = 'flex';
            if (adminSection) adminSection.style.display = 'none';
            if (adminPanel) adminPanel.style.display = 'none';
        }
    }

    updateCategoryOptions() {
        const categorySelects = ['fileCategory', 'categoryFilter', 'editCategory'];
        
        categorySelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;
            
            // 기존 옵션 제거 (첫 번째 옵션 제외)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            // 카테고리 옵션 추가
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.name;
                select.appendChild(option);
            });
        });
    }

    handleSearch() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const categoryFilter = document.getElementById('categoryFilter').value;
        
        let filteredFiles = this.files;
        
        if (searchTerm) {
            filteredFiles = filteredFiles.filter(file => 
                file.title.toLowerCase().includes(searchTerm) ||
                file.description.toLowerCase().includes(searchTerm) ||
                (file.tags && this.parseJsonTags(file.tags).some(tag => tag.toLowerCase().includes(searchTerm)))
            );
        }
        
        if (categoryFilter) {
            filteredFiles = filteredFiles.filter(file => file.category === categoryFilter);
        }
        
        this.filteredFiles = filteredFiles;
        this.currentPage = 1;
        this.renderFiles();
        this.updatePagination();
    }

    parseJsonTags(tags) {
        try {
            if (typeof tags === 'string') {
                return JSON.parse(tags);
            }
            return Array.isArray(tags) ? tags : [];
        } catch (error) {
            return [];
        }
    }

    renderFiles() {
        const fileList = document.getElementById('fileList');
        const sortBy = document.getElementById('sortBy').value;
        
        if (!fileList) return;
        
        // 정렬
        const sortedFiles = [...this.filteredFiles].sort((a, b) => {
            switch (sortBy) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'category':
                    return a.category.localeCompare(b.category);
                case 'date':
                default:
                    return new Date(b.created_at) - new Date(a.created_at);
            }
        });
        
        // 페이지네이션 적용
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedFiles = sortedFiles.slice(startIndex, endIndex);
        
        if (sortedFiles.length === 0) {
            fileList.innerHTML = `
                <tr class="empty-state">
                    <td colspan="6">📂 조건에 맞는 자료가 없습니다.</td>
                </tr>
            `;
            return;
        }

        fileList.innerHTML = paginatedFiles.map((file, index) => 
            this.createFileRowHTML(file, startIndex + index + 1)
        ).join('');
    }

    createFileRowHTML(file, rowNumber) {
        const createdDate = new Date(file.created_at).toLocaleDateString('ko-KR');
        const hasAttachments = file.files && file.files.length > 0;
        const tags = this.parseJsonTags(file.tags);
        
        return `
            <tr data-id="${file.id}">
                <td class="col-no">${rowNumber}</td>
                <td class="col-category">
                    <span class="category-badge category-${file.category}">${file.category}</span>
                </td>
                <td class="col-title">
                    <div class="board-title">
                        <a href="#" onclick="adminManager.showFileDetail.call(adminManager, '${file.id}'); return false;" class="title-link">
                            ${this.escapeHtml(file.title)}
                        </a>
                        ${file.description ? `<br><small style="color: #666; font-weight: normal;">${this.escapeHtml(file.description)}</small>` : ''}
                        ${tags.length > 0 ? 
                            `<br><div style="margin-top: 4px;">${tags.map(tag => `<span style="display: inline-block; background: #e5e7eb; color: #374151; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem; margin-right: 4px;">#${this.escapeHtml(tag)}</span>`).join('')}</div>` : ''
                        }
                    </div>
                </td>
                <td class="col-attachment">
                    ${hasAttachments ? 
                        `<div class="attachment-list">
                            ${file.files.map((f, index) => 
                                `<div class="attachment-item-admin" onclick="adminManager.downloadSingleFile.call(adminManager, '${file.id}', ${index})" title="클릭하여 다운로드">
                                    <span class="attachment-file-icon">${this.getFileIcon(f.original_name || 'unknown')}</span>
                                    <span class="attachment-file-name">${this.escapeHtml(f.original_name || '파일')}</span>
                                </div>`
                            ).join('')}
                        </div>` : 
                        `<span class="no-attachment">-</span>`
                    }
                </td>
                <td class="col-date">${createdDate}</td>
                <td class="col-actions">
                    <button class="action-btn btn-edit" onclick="adminManager.editFile('${file.id}')" title="수정">✏️</button>
                    ${hasAttachments ? 
                        `<button class="action-btn btn-download" onclick="adminManager.downloadFiles.call(adminManager, '${file.id}')" title="전체 다운로드">📥</button>` : 
                        ''
                    }
                    <button class="action-btn btn-delete" onclick="adminManager.deleteFile('${file.id}')" title="삭제">🗑️</button>
                </td>
            </tr>
        `;
    }

    async handleAddFile() {
        if (!this.isLoggedIn) {
            this.showNotification('로그인이 필요합니다.', 'error');
            return;
        }

        const title = document.getElementById('fileTitle').value.trim();
        const description = document.getElementById('fileDescription').value.trim();
        const category = document.getElementById('fileCategory').value;
        const tags = document.getElementById('fileTags').value.trim();
        const fileInput = document.getElementById('fileUpload');

        if (!title || !category) {
            this.showNotification('제목과 카테고리는 필수입니다.', 'error');
            return;
        }

        try {
            // 로딩 상태 표시
            this.showLoadingState('파일 등록 중...', true);
            
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = '등록 중...';

            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('category', category);
            formData.append('tags', JSON.stringify(tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []));

            // 파일 추가
            if (fileInput.files.length > 0) {
                for (const file of fileInput.files) {
                    formData.append('files', file);
                }
            }

            const response = await fetch('/api/files', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('파일이 성공적으로 등록되었습니다!', 'success');
                this.resetForm();
                await this.loadData();
            } else {
                throw new Error(data.message || '파일 등록에 실패했습니다.');
            }
        } catch (error) {
            console.error('파일 추가 오류:', error);
            this.showNotification(error.message || '파일 등록 중 오류가 발생했습니다.', 'error');
        } finally {
            // 로딩 상태 해제 및 버튼 복원
            this.hideLoadingState();
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = false;
            submitBtn.textContent = '📤 추가';
        }
    }

    async deleteFile(id) {
        if (!confirm('정말로 이 파일을 삭제하시겠습니까?')) {
            return;
        }

        try {
            const response = await fetch(`/api/files/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showNotification('파일이 삭제되었습니다.', 'success');
                await this.loadData();
            } else {
                const data = await response.json();
                throw new Error(data.message || '파일 삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('파일 삭제 오류:', error);
            this.showNotification(error.message || '파일 삭제 중 오류가 발생했습니다.', 'error');
        }
    }

    editFile(id) {
        const file = this.files.find(f => f.id === id);
        if (!file) {
            this.showNotification('파일을 찾을 수 없습니다.', 'error');
            return;
        }

        // 수정 모달에 데이터 채우기
        document.getElementById('editTitle').value = file.title;
        document.getElementById('editDescription').value = file.description || '';
        document.getElementById('editCategory').value = file.category;
        
        const tags = this.parseJsonTags(file.tags);
        document.getElementById('editTags').value = tags.join(', ');

        // 기존 첨부파일 표시
        this.renderExistingAttachments(file.files || []);
        
        // 첨부파일 삭제 목록 초기화
        this.filesToDelete = [];
        
        // 새 파일 입력 초기화
        const newAttachmentsInput = document.getElementById('newAttachments');
        if (newAttachmentsInput) {
            newAttachmentsInput.value = '';
        }
        
        // 새 파일 미리보기 초기화
        this.updateNewFilesPreview([]);

        // 수정 모달 이벤트 바인딩 (한번만)
        if (!this.editModalEventsBound) {
            this.bindEditModalEvents();
        }

        this.currentEditId = id;
        document.getElementById('editModal').style.display = 'flex';
    }

    // 기존 첨부파일 렌더링
    renderExistingAttachments(attachments) {
        const container = document.getElementById('existingAttachments');
        const noFilesIndicator = document.getElementById('noExistingFiles');
        
        if (!attachments || attachments.length === 0) {
            noFilesIndicator.style.display = 'block';
            // 기존 파일 아이템들 제거
            const existingItems = container.querySelectorAll('.attachment-item');
            existingItems.forEach(item => item.remove());
            return;
        }

        noFilesIndicator.style.display = 'none';
        
        // 기존 아이템들 제거
        const existingItems = container.querySelectorAll('.attachment-item');
        existingItems.forEach(item => item.remove());
        
        // 새로운 첨부파일 아이템들 추가
        attachments.forEach((file, index) => {
            const fileIcon = this.getFileIcon(file.original_name);
            const fileSize = this.formatFileSize(file.file_size);
            
            const attachmentItem = document.createElement('div');
            attachmentItem.className = 'attachment-item';
            attachmentItem.setAttribute('data-attachment-id', file.id);
            
            attachmentItem.innerHTML = `
                <div class="attachment-info">
                    <span class="attachment-icon">${fileIcon}</span>
                    <div class="attachment-details">
                        <div class="attachment-name">${this.escapeHtml(file.original_name)}</div>
                        <div class="attachment-size">${fileSize}</div>
                    </div>
                </div>
                <div class="attachment-actions">
                    <button type="button" class="attachment-download-btn" onclick="adminManager.downloadFile('${this.currentEditId}', '${file.id}')">
                        💾 다운로드
                    </button>
                    <button type="button" class="attachment-delete-btn" onclick="adminManager.markAttachmentForDeletion(${file.id}, this)">
                        🗑️ 삭제
                    </button>
                </div>
            `;
            
            container.appendChild(attachmentItem);
        });
    }

    // 첨부파일 삭제 표시
    markAttachmentForDeletion(attachmentId, buttonElement) {
        const attachmentItem = buttonElement.closest('.attachment-item');
        
        if (!this.filesToDelete) {
            this.filesToDelete = [];
        }
        
        if (this.filesToDelete.includes(attachmentId)) {
            // 삭제 취소
            this.filesToDelete = this.filesToDelete.filter(id => id !== attachmentId);
            attachmentItem.style.opacity = '1';
            attachmentItem.style.textDecoration = 'none';
            buttonElement.innerHTML = '🗑️ 삭제';
            buttonElement.style.background = '#ef4444';
        } else {
            // 삭제 표시
            this.filesToDelete.push(attachmentId);
            attachmentItem.style.opacity = '0.5';
            attachmentItem.style.textDecoration = 'line-through';
            buttonElement.innerHTML = '↶ 취소';
            buttonElement.style.background = '#6b7280';
        }
    }

    // 파일 크기 포맷팅
    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    async handleUpdateFile() {
        if (!this.currentEditId) {
            this.showNotification('수정할 파일을 찾을 수 없습니다.', 'error');
            return;
        }

        // 중복 실행 방지 플래그 설정
        if (this.isUpdating) {
            console.log('이미 업데이트 중입니다.');
            return;
        }
        this.isUpdating = true;

        const title = document.getElementById('editTitle').value.trim();
        const description = document.getElementById('editDescription').value.trim();
        const category = document.getElementById('editCategory').value;
        const tags = document.getElementById('editTags').value.trim();

        if (!title || !category) {
            this.isUpdating = false; // 플래그 해제
            this.showNotification('제목과 카테고리는 필수입니다.', 'error');
            return;
        }

        try {
            // 로딩 상태 표시 시작
            this.showLoadingState('수정 중...', true);
            
            // FormData를 사용하여 파일과 데이터를 함께 전송
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('category', category);
            formData.append('tags', JSON.stringify(tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []));
            
            // 삭제할 첨부파일 ID들
            if (this.filesToDelete && this.filesToDelete.length > 0) {
                formData.append('filesToDelete', JSON.stringify(this.filesToDelete));
            }
            
            // 새로 추가할 첨부파일들
            const newFileInput = document.getElementById('newAttachments');
            if (newFileInput && newFileInput.files.length > 0) {
                for (const file of newFileInput.files) {
                    formData.append('files', file);
                }
            }

            // API 클라이언트를 사용하여 파일 업데이트
            const data = await window.AdminAPI.Files.update(this.currentEditId, formData);

            this.showNotification('파일이 성공적으로 수정되었습니다!', 'success');
            document.getElementById('editModal').style.display = 'none';
            this.currentEditId = null;
            this.filesToDelete = [];
            
            // 새 파일 미리보기 초기화
            this.updateNewFilesPreview([]);
            const newAttachmentsInput = document.getElementById('newAttachments');
            if (newAttachmentsInput) {
                newAttachmentsInput.value = '';
            }
            
            await this.loadData();
        } catch (error) {
            console.error('파일 수정 오류:', error);
            this.showNotification(error.message || '파일 수정 중 오류가 발생했습니다.', 'error');
        } finally {
            // 작업 완료 후 플래그 해제 및 로딩 상태 제거
            this.isUpdating = false;
            this.hideLoadingState();
        }
    }

    async downloadFiles(id) {
        console.log('downloadFiles 호출됨:', id);
        const file = this.files.find(f => f.id === id);
        console.log('찾은 파일:', file);
        
        if (!file || !file.files || file.files.length === 0) {
            console.log('첨부파일 없음');
            this.showNotification('첨부파일이 없습니다.', 'error');
            return;
        }

        try {
            console.log('다운로드 시작, 파일 개수:', file.files.length);
            if (file.files.length === 1) {
                // 단일 파일: 직접 다운로드
                console.log('단일 파일 다운로드');
                await this.downloadSingleFile(id, 0);
                this.showNotification('파일 다운로드 완료', 'success');
            } else {
                // 다중 파일: 각각 다운로드
                console.log('다중 파일 다운로드');
                for (let i = 0; i < file.files.length; i++) {
                    console.log(`파일 ${i + 1}/${file.files.length} 다운로드 중`);
                    await this.downloadSingleFile(id, i);
                    // 짧은 딜레이를 추가하여 브라우저가 다운로드를 처리할 시간을 줌
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                this.showNotification(`${file.files.length}개 파일 다운로드 완료`, 'success');
            }
        } catch (error) {
            console.error('파일 다운로드 오류:', error);
            this.showNotification(`다운로드 오류: ${error.message}`, 'error');
        }
    }

    async downloadSingleFile(fileId, attachmentIndex) {
        try {
            // 다운로드 시작 로딩 표시
            this.showLoadingState('다운로드 준비 중...', false);
            
            console.log('downloadSingleFile 호출됨:', fileId, attachmentIndex);
            const file = this.files.find(f => f.id === fileId);
            console.log('찾은 파일:', file);
            
            if (!file || !file.files[attachmentIndex]) {
                console.log('파일 또는 첨부파일을 찾을 수 없음');
                throw new Error('파일을 찾을 수 없습니다.');
            }
            
            const attachmentId = file.files[attachmentIndex].id;
            const downloadUrl = `/api/download/${fileId}/${attachmentId}`;
            console.log('다운로드 URL:', downloadUrl);
            
            const response = await fetch(downloadUrl, {
                credentials: 'include'
            });
            console.log('응답 상태:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.log('응답 오류:', errorText);
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }
            
            console.log('다운로드 시작...');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            // 파일명을 서버에서 전송된 정보에서 추출 (개선된 방식)
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = file.files[attachmentIndex].original_name || `download_${Date.now()}`;
            
            console.log('📁 다운로드 파일명 처리:', {
                original_name: file.files[attachmentIndex].original_name,
                content_disposition: contentDisposition,
                default_filename: filename
            });
            
            if (contentDisposition) {
                // RFC 5987 filename* 파라미터를 우선 처리 (UTF-8 지원)
                const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
                if (filenameStarMatch) {
                    filename = decodeURIComponent(filenameStarMatch[1]);
                    console.log('📁 UTF-8 파일명 추출:', filename);
                } else {
                    // 일반 filename 파라미터 처리
                    const filenameMatch = contentDisposition.match(/filename="?([^";\r\n]+)"?/);
                    if (filenameMatch) {
                        filename = filenameMatch[1];
                        console.log('📁 기본 파일명 추출:', filename);
                    }
                }
            }
            
            // 파일명이 여전히 비어있다면 기본값 사용
            if (!filename || filename.trim() === '') {
                filename = file.files[attachmentIndex].original_name || `download_${Date.now()}`;
                console.log('📁 기본 파일명 사용:', filename);
            }
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            console.log('다운로드 완료');
            this.hideLoadingState();
            
        } catch (error) {
            console.error('downloadSingleFile 오류:', error);
            this.hideLoadingState();
            throw error;
        }
    }

    handleFileSelection(files) {
        const selectedFiles = document.getElementById('selectedFiles');
        if (!selectedFiles) return;

        selectedFiles.innerHTML = '';
        
        Array.from(files).forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'selected-file-item';
            fileItem.innerHTML = `
                <span class="file-icon">${this.getFileIcon(file.name)}</span>
                <span class="file-name">${this.escapeHtml(file.name)}</span>
                <span class="file-size">${this.formatFileSize(file.size)}</span>
            `;
            selectedFiles.appendChild(fileItem);
        });
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

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    resetForm() {
        document.getElementById('fileTitle').value = '';
        document.getElementById('fileDescription').value = '';
        document.getElementById('fileCategory').value = '';
        document.getElementById('fileTags').value = '';
        document.getElementById('fileUpload').value = '';
        
        const selectedFiles = document.getElementById('selectedFiles');
        if (selectedFiles) selectedFiles.innerHTML = '';
    }

    updatePagination() {
        const totalPages = Math.max(1, Math.ceil(this.filteredFiles.length / this.itemsPerPage));
        const pagination = document.getElementById('pagination');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const pageInfo = document.getElementById('pageInfo');
        
        if (!pagination) return;
        
        pagination.style.display = 'flex';
        
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages || this.filteredFiles.length === 0;
        
        const displayTotalPages = this.filteredFiles.length === 0 ? 1 : totalPages;
        const displayCurrentPage = this.filteredFiles.length === 0 ? 1 : this.currentPage;
        if (pageInfo) pageInfo.textContent = `${displayCurrentPage} / ${displayTotalPages}`;
    }

    goToPrevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderFiles();
            this.updatePagination();
        }
    }

    goToNextPage() {
        const totalPages = Math.ceil(this.filteredFiles.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderFiles();
            this.updatePagination();
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 400px;
            background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }

    showFileDetail(id) {
        const file = this.files.find(f => f.id === id);
        if (!file) {
            this.showNotification('파일을 찾을 수 없습니다.', 'error');
            return;
        }

        const tags = this.parseJsonTags(file.tags);
        const createdDate = new Date(file.created_at).toLocaleString('ko-KR');
        const updatedDate = new Date(file.updated_at).toLocaleString('ko-KR');

        const modalHTML = `
            <div class="modal-overlay" onclick="this.remove()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>📄 파일 상세정보</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="info-group">
                            <label>📝 제목</label>
                            <div class="info-value">${this.escapeHtml(file.title)}</div>
                        </div>
                        
                        ${file.description ? `
                        <div class="info-group">
                            <label>📖 설명</label>
                            <div class="info-value">${this.escapeHtml(file.description)}</div>
                        </div>` : ''}
                        
                        <div class="info-group">
                            <label>🏷️ 카테고리</label>
                            <div class="info-value">
                                <span class="category-badge category-${file.category}">${file.category}</span>
                            </div>
                        </div>
                        
                        ${tags.length > 0 ? `
                        <div class="info-group">
                            <label>🏷️ 태그</label>
                            <div class="info-value">
                                <div class="tag-list">
                                    ${tags.map(tag => `<span class="tag-item">#${this.escapeHtml(tag)}</span>`).join('')}
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
                                            <span class="attachment-icon">${this.getFileIcon(f.original_name || 'unknown')}</span>
                                            <span class="attachment-name">${this.escapeHtml(f.original_name || '파일')}</span>
                                            <button class="download-single-btn" onclick="adminManager.downloadSingleFile.call(adminManager, '${file.id}', ${index})" title="다운로드">
                                                📥 다운로드
                                            </button>
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="attachment-actions">
                                    <button class="download-all-btn" onclick="adminManager.downloadFiles.call(adminManager, '${file.id}')" title="모든 파일 다운로드">
                                        📦 모든 파일 다운로드
                                    </button>
                                </div>
                            </div>
                        </div>` : `
                        <div class="info-group">
                            <label>📎 첨부파일</label>
                            <div class="info-value">첨부파일이 없습니다.</div>
                        </div>`}
                        
                        <div class="info-group">
                            <label>📅 생성일</label>
                            <div class="info-value">${createdDate}</div>
                        </div>
                        
                        <div class="info-group">
                            <label>🔄 수정일</label>
                            <div class="info-value">${updatedDate}</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">닫기</button>
                        <button class="btn btn-primary" onclick="adminManager.editFile('${file.id}')">수정</button>
                        <button class="btn btn-danger" onclick="adminManager.deleteFile('${file.id}')">삭제</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    async handleAddCategory() {
        const categoryName = document.getElementById('categoryName').value.trim();
        
        if (!categoryName) {
            this.showNotification('카테고리 이름을 입력해주세요.', 'error');
            return;
        }

        // 중복 확인
        if (this.categories.some(cat => cat.name === categoryName)) {
            this.showNotification('이미 존재하는 카테고리입니다.', 'error');
            return;
        }

        try {
            const data = await window.AdminAPI.Categories.create(categoryName);
            this.showNotification('카테고리가 추가되었습니다!', 'success');
            this.resetCategoryForm();
            await this.loadData();
            this.renderCategoryList();
        } catch (error) {
            console.error('카테고리 추가 오류:', error);
            this.showNotification(error.message || '카테고리 추가 중 오류가 발생했습니다.', 'error');
        }
    }

    resetCategoryForm() {
        document.getElementById('categoryName').value = '';
    }

    renderCategoryList() {
        console.log('renderCategoryList 호출됨');
        console.log('현재 카테고리 데이터:', this.categories);
        
        const categoryList = document.getElementById('categoryList');
        if (!categoryList) {
            console.error('categoryList 요소를 찾을 수 없습니다');
            return;
        }

        if (this.categories.length === 0) {
            console.log('카테고리가 없어서 빈 메시지 표시');
            categoryList.innerHTML = '<p class="empty-message">등록된 카테고리가 없습니다.</p>';
            return;
        }

        console.log('카테고리 목록 렌더링 시작');
        categoryList.innerHTML = this.categories.map(category => {
            console.log('카테고리 렌더링:', category);
            return `
            <div class="category-item" data-id="${category.id}">
                <span class="category-name">${this.escapeHtml(category.name)}</span>
                <div class="category-actions">
                    <button class="btn-edit-category" onclick="adminManager.editCategory('${category.id}')" title="수정">✏️</button>
                    <button class="btn-delete-category" onclick="adminManager.deleteCategory('${category.id}')" title="삭제">🗑️</button>
                </div>
            </div>
            `;
        }).join('');
        console.log('카테고리 목록 렌더링 완료');
    }

    editCategory(id) {
        console.log('editCategory 호출됨, ID:', id, 'Type:', typeof id);
        console.log('전체 카테고리 목록:', this.categories);
        
        const category = this.categories.find(c => {
            console.log('비교:', c.id, 'vs', id, 'Type:', typeof c.id, 'vs', typeof id);
            return c.id == id; // == 사용으로 타입 변환 허용
        });
        
        console.log('찾은 카테고리:', category);
        
        if (!category) {
            console.error('카테고리를 찾을 수 없습니다. ID:', id);
            this.showNotification('카테고리를 찾을 수 없습니다.', 'error');
            return;
        }

        document.getElementById('editCategoryName').value = category.name;
        this.currentEditCategoryId = id;
        document.getElementById('editCategoryModal').style.display = 'flex';
    }

    async handleUpdateCategory() {
        if (!this.currentEditCategoryId) {
            this.showNotification('수정할 카테고리를 찾을 수 없습니다.', 'error');
            return;
        }

        const categoryName = document.getElementById('editCategoryName').value.trim();
        
        if (!categoryName) {
            this.showNotification('카테고리 이름을 입력해주세요.', 'error');
            return;
        }

        // 중복 확인 (자기 자신 제외)
        if (this.categories.some(cat => cat.name === categoryName && cat.id !== this.currentEditCategoryId)) {
            this.showNotification('이미 존재하는 카테고리입니다.', 'error');
            return;
        }

        try {
            const data = await window.AdminAPI.Categories.update(this.currentEditCategoryId, categoryName);
            this.showNotification('카테고리가 수정되었습니다!', 'success');
            document.getElementById('editCategoryModal').style.display = 'none';
            this.currentEditCategoryId = null;
            await this.loadData();
            this.renderCategoryList();
        } catch (error) {
            console.error('카테고리 수정 오류:', error);
            this.showNotification(error.message || '카테고리 수정 중 오류가 발생했습니다.', 'error');
        }
    }

    async deleteCategory(id) {
        console.log('deleteCategory 호출됨, ID:', id, 'Type:', typeof id);
        console.log('전체 카테고리 목록:', this.categories);
        
        const category = this.categories.find(c => {
            console.log('비교:', c.id, 'vs', id, 'Type:', typeof c.id, 'vs', typeof id);
            return c.id == id; // == 사용으로 타입 변환 허용
        });
        
        console.log('찾은 카테고리:', category);
        
        if (!category) {
            console.error('카테고리를 찾을 수 없습니다. ID:', id);
            this.showNotification('카테고리를 찾을 수 없습니다.', 'error');
            return;
        }

        // 해당 카테고리를 사용하는 파일이 있는지 확인
        const filesUsingCategory = this.files.filter(file => file.category === category.name);
        if (filesUsingCategory.length > 0) {
            if (!confirm(`이 카테고리는 ${filesUsingCategory.length}개의 파일에서 사용 중입니다.\n정말로 삭제하시겠습니까? (사용 중인 파일들의 카테고리가 '기타'로 변경됩니다.)`)) {
                return;
            }
        } else {
            if (!confirm(`정말로 '${category.name}' 카테고리를 삭제하시겠습니까?`)) {
                return;
            }
        }

        try {
            await window.AdminAPI.Categories.delete(id);
            this.showNotification('카테고리가 삭제되었습니다.', 'success');
            await this.loadData();
            this.renderCategoryList();
        } catch (error) {
            console.error('카테고리 삭제 오류:', error);
            this.showNotification(error.message || '카테고리 삭제 중 오류가 발생했습니다.', 'error');
        }
    }

    // 로딩 상태 표시
    showLoadingState(message = '처리 중...', disableForm = false) {
        console.log('🔄 로딩 상태 표시:', message);
        
        // 기존 로딩 인디케이터 제거
        this.hideLoadingState();
        
        // 로딩 오버레이 생성
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
            </div>
        `;
        
        document.body.appendChild(loadingOverlay);
        
        // 폼 비활성화 (선택적)
        if (disableForm) {
            const forms = document.querySelectorAll('form, button');
            forms.forEach(element => {
                element.style.pointerEvents = 'none';
                element.style.opacity = '0.6';
            });
        }
    }
    
    // 로딩 상태 숨김
    hideLoadingState() {
        console.log('✅ 로딩 상태 해제');
        
        // 로딩 오버레이 제거
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
        
        // 폼 활성화
        const forms = document.querySelectorAll('form, button');
        forms.forEach(element => {
            element.style.pointerEvents = '';
            element.style.opacity = '';
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 전역 인스턴스 생성
let adminManager;
document.addEventListener('DOMContentLoaded', () => {
    adminManager = new AdminFileManager();
    window.adminManager = adminManager; // 전역 접근 가능하도록
});