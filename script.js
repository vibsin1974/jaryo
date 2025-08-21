class PublicFileViewer {
    constructor() {
        this.files = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filteredFiles = [];
        
        this.init();
    }

    async init() {
        console.log('🚀 PublicFileViewer 초기화 시작');
        
        try {
            this.showLoading(true);
            console.log('📡 파일 목록 로드 중...');
            await this.loadFiles();
            this.filteredFiles = [...this.files];
            console.log(`✅ ${this.files.length}개 파일 로드 완료`);
            
            this.bindEvents();
            this.renderFiles();
            this.updatePagination();
        } catch (error) {
            console.error('❌ 초기화 오류:', error);
            this.showNotification('데이터를 불러오는 중 오류가 발생했습니다. 페이지를 새로고침 해주세요.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    bindEvents() {
        // 검색 및 정렬 이벤트
        document.getElementById('searchBtn').addEventListener('click', () => this.handleSearch());
        document.getElementById('searchInput').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        document.getElementById('categoryFilter').addEventListener('change', () => this.handleSearch());
        document.getElementById('sortBy').addEventListener('change', () => this.handleSearch());
        
        // 페이지네이션 이벤트
        document.getElementById('prevPage').addEventListener('click', () => this.goToPrevPage());
        document.getElementById('nextPage').addEventListener('click', () => this.goToNextPage());
    }

    async loadFiles() {
        try {
            const response = await fetch('/api/files/public');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.files = data.data || [];
            console.log('파일 로드 완료:', this.files.length, '개');
        } catch (error) {
            console.error('파일 로드 오류:', error);
            this.files = [];
            throw error;
        }
    }

    handleSearch() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const categoryFilter = document.getElementById('categoryFilter').value;
        
        let filteredFiles = this.files;
        
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
        
        this.filteredFiles = filteredFiles;
        this.currentPage = 1; // 검색 시 첫 페이지로 리셋
        this.renderFiles();
        this.updatePagination();
    }

    renderFiles() {
        const fileList = document.getElementById('fileList');
        const sortBy = document.getElementById('sortBy').value;
        
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
        
        return `
            <tr data-id="${file.id}">
                <td class="col-no">${rowNumber}</td>
                <td class="col-category">
                    <span class="category-badge category-${file.category}">${file.category}</span>
                </td>
                <td class="col-title">
                    <div class="board-title" onclick="publicViewer.viewFileInfo('${file.id}')">
                        ${this.escapeHtml(file.title)}
                        ${file.description ? `<br><small style="color: #666; font-weight: normal;">${this.escapeHtml(file.description)}</small>` : ''}
                        ${file.tags && file.tags.length > 0 ? 
                            `<br><div style="margin-top: 4px;">${this.parseJsonTags(file.tags).map(tag => `<span style="display: inline-block; background: #e5e7eb; color: #374151; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem; margin-right: 4px;">#${this.escapeHtml(tag)}</span>`).join('')}</div>` : ''
                        }
                    </div>
                </td>
                <td class="col-attachment">
                    ${hasAttachments ? 
                        `<div class="attachment-list">
                            ${file.files.map((f, index) => 
                                `<div class="attachment-item-public" onclick="publicViewer.downloadSingleFile('${file.id}', ${index})" title="클릭하여 다운로드">
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
                    ${hasAttachments ? 
                        `<button class="action-btn btn-download" onclick="publicViewer.downloadFiles('${file.id}')" title="다운로드">📥</button>` : 
                        `<span class="no-attachment">-</span>`
                    }
                </td>
            </tr>
        `;
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

    viewFileInfo(id) {
        const file = this.files.find(f => f.id === id);
        if (!file) return;

        this.showDetailView(file);
    }

    showDetailView(file) {
        const container = document.querySelector('.container');
        container.style.display = 'none';
        
        const detailContainer = document.createElement('div');
        detailContainer.className = 'detail-container';
        detailContainer.id = 'detailContainer';
        
        const createdDate = new Date(file.created_at).toLocaleDateString('ko-KR');
        const updatedDate = new Date(file.updated_at).toLocaleDateString('ko-KR');
        const tags = this.parseJsonTags(file.tags);
        
        detailContainer.innerHTML = `
            <div class="container">
                <header>
                    <h1>📋 자료 상세보기</h1>
                    <p>등록된 자료의 상세 정보를 확인하세요</p>
                </header>

                <div class="detail-section">
                    <div class="detail-header">
                        <h2>📄 ${this.escapeHtml(file.title)}</h2>
                        <button class="back-btn" onclick="publicViewer.hideDetailView()">
                            ← 목록으로 돌아가기
                        </button>
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
                            
                            ${tags && tags.length > 0 ? `
                            <div class="info-group">
                                <label>🏷️ 태그</label>
                                <div class="info-value">
                                    <div class="tags-container">
                                        ${tags.map(tag => `<span class="tag">#${this.escapeHtml(tag)}</span>`).join('')}
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
                                                <button class="download-single-btn" onclick="publicViewer.downloadSingleFile('${file.id}', ${index})" title="다운로드">
                                                    📥 다운로드
                                                </button>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <div class="attachment-actions">
                                        <button class="download-all-btn" onclick="publicViewer.downloadFiles('${file.id}')" title="모든 파일 다운로드">
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
        
        const container = document.querySelector('.container');
        container.style.display = 'block';
    }

    async downloadFiles(id) {
        const file = this.files.find(f => f.id === id);
        if (!file || !file.files || file.files.length === 0) {
            this.showNotification('첨부파일이 없습니다.', 'error');
            return;
        }

        try {
            if (file.files.length === 1) {
                // 단일 파일: 직접 다운로드
                await this.downloadSingleFile(id, 0);
            } else {
                // 다중 파일: 각각 다운로드
                for (let i = 0; i < file.files.length; i++) {
                    await this.downloadSingleFile(id, i);
                    // 짧은 딜레이를 추가하여 브라우저가 다운로드를 처리할 시간을 줌
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                this.showNotification(`${file.files.length}개 파일 다운로드 완료`, 'success');
            }
        } catch (error) {
            console.error('파일 다운로드 오류:', error);
            this.showNotification('파일 다운로드 중 오류가 발생했습니다.', 'error');
        }
    }

    async downloadSingleFile(fileId, attachmentIndex) {
        try {
            // 다운로드 시작 로딩 표시
            this.showLoading(true);
            
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
            this.showLoading(false);
            
            if (arguments.length === 2) { // 단일 파일 다운로드인 경우만 알림 표시
                this.showNotification(`파일 다운로드 완료: ${filename}`, 'success');
            }
        } catch (error) {
            console.error('downloadSingleFile 오류:', error);
            this.showLoading(false);
            this.showNotification('파일 다운로드 중 오류가 발생했습니다.', 'error');
        }
    }

    updatePagination() {
        const totalPages = Math.max(1, Math.ceil(this.filteredFiles.length / this.itemsPerPage));
        const pagination = document.getElementById('pagination');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const pageInfo = document.getElementById('pageInfo');
        
        pagination.style.display = 'flex';
        
        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= totalPages || this.filteredFiles.length === 0;
        
        const displayTotalPages = this.filteredFiles.length === 0 ? 1 : totalPages;
        const displayCurrentPage = this.filteredFiles.length === 0 ? 1 : this.currentPage;
        pageInfo.textContent = `${displayCurrentPage} / ${displayTotalPages}`;
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

    showLoading(show) {
        const loadingEl = document.getElementById('loadingMessage');
        if (loadingEl) {
            loadingEl.style.display = show ? 'block' : 'none';
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 전역 인스턴스 생성
let publicViewer;
document.addEventListener('DOMContentLoaded', () => {
    publicViewer = new PublicFileViewer();
});