class FileManager {
    constructor() {
        this.files = [];
        this.currentEditId = null;
        this.isOnline = navigator.onLine;
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filteredFiles = [];
        
        this.init();
    }

    async init() {
        // 오프라인 모드로만 실행
        this.files = this.loadFiles();
        this.filteredFiles = [...this.files];
        this.bindEvents();
        this.renderFiles();
        this.updatePagination();
    }

    bindEvents() {
        // 검색 및 정렬 이벤트만 유지
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

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
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
        
        // 정렬 (관리자 페이지와 동일하게)
        const sortedFiles = [...this.filteredFiles].sort((a, b) => {
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
        const createdDate = new Date(file.created_at || file.createdAt).toLocaleDateString('ko-KR');
        const hasAttachments = file.files && file.files.length > 0;
        
        return `
            <tr data-id="${file.id}">
                <td class="col-no">${rowNumber}</td>
                <td class="col-category">
                    <span class="category-badge category-${file.category}">${file.category}</span>
                </td>
                <td class="col-title">
                    <div class="board-title" onclick="fileManager.viewFileInfo('${file.id}')">
                        ${this.escapeHtml(file.title)}
                        ${file.description ? `<br><small style="color: #666; font-weight: normal;">${this.escapeHtml(file.description)}</small>` : ''}
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
                    ${hasAttachments ? 
                        `<button class="action-btn btn-download" onclick="fileManager.downloadFiles('${file.id}')" title="다운로드">📥</button>` : 
                        `<span class="no-attachment">-</span>`
                    }
                </td>
            </tr>
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
                    <p>등록된 자료의 상세 정보를 확인하세요</p>
                </header>

                <div class="detail-section">
                    <div class="detail-header">
                        <h2>📄 ${this.escapeHtml(file.title)}</h2>
                        <button class="back-btn" onclick="fileManager.hideDetailView()">
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

    async downloadFiles(id) {
        const file = this.files.find(f => f.id === id);
        if (!file) {
            this.showNotification('파일을 찾을 수 없습니다.', 'error');
            return;
        }
        if (!file.files || file.files.length === 0) {
            this.showNotification('첨부파일이 없습니다.', 'error');
            return;
        }

        try {
            if (file.files.length === 1) {
                // 단일 파일: 직접 다운로드
                await this.downloadSingleFileData(file.files[0]);
                this.showNotification(`파일 다운로드 완료: ${file.files[0].name || file.files[0].original_name}`, 'success');
            } else {
                // 다중 파일: localStorage에서 base64 데이터를 각각 다운로드
                for (const fileData of file.files) {
                    await this.downloadSingleFileData(fileData);
                }
                this.showNotification(`${file.files.length}개 파일 다운로드 완료`, 'success');
            }
        } catch (error) {
            console.error('파일 다운로드 오류:', error);
            this.showNotification('파일 다운로드 중 오류가 발생했습니다.', 'error');
        }
    }

    async downloadSingleFile(fileId, fileIndex) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) {
            this.showNotification('파일을 찾을 수 없습니다.', 'error');
            return;
        }
        if (!file.files || !file.files[fileIndex]) {
            this.showNotification('첨부파일을 찾을 수 없습니다.', 'error');
            return;
        }

        try {
            const fileData = file.files[fileIndex];
            await this.downloadSingleFileData(fileData);
            this.showNotification(`파일 다운로드 완료: ${fileData.name || fileData.original_name}`, 'success');
        } catch (error) {
            console.error('개별 파일 다운로드 오류:', error);
            this.showNotification('파일 다운로드 중 오류가 발생했습니다.', 'error');
        }
    }

    async downloadSingleFileData(fileData) {
        if (fileData.data) {
            // localStorage의 base64 데이터 다운로드
            const link = document.createElement('a');
            link.href = fileData.data;
            link.download = fileData.name || fileData.original_name || 'file';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    showNotification(message, type = 'info') {
        // 간단한 알림 표시
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

    updatePagination() {
        const totalPages = Math.max(1, Math.ceil(this.filteredFiles.length / this.itemsPerPage));
        const pagination = document.getElementById('pagination');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const pageInfo = document.getElementById('pageInfo');
        
        // 항상 페이지네이션을 표시
        pagination.style.display = 'flex';
        
        // 페이지 버튼 상태 업데이트
        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= totalPages || this.filteredFiles.length === 0;
        
        // 페이지 정보 표시 (아이템이 없어도 1/1로 표시)
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


    loadFiles() {
        try {
            const stored = localStorage.getItem('fileManagerData');
            const files = stored ? JSON.parse(stored) : [];
            
            // 기존 localStorage 데이터의 호환성을 위해 컴럼명 변환
            return files.map(file => ({
                ...file,
                created_at: file.created_at || file.createdAt || new Date().toISOString(),
                updated_at: file.updated_at || file.updatedAt || new Date().toISOString()
            }));
        } catch (error) {
            console.error('파일 로드 중 오류:', error);
            return [];
        }
    }

    saveFiles() {
        try {
            localStorage.setItem('fileManagerData', JSON.stringify(this.files));
        } catch (error) {
            console.error('파일 저장 중 오류:', error);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showMessage(message, type = 'success') {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : '#10b981'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(messageEl);
        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => messageEl.remove(), 300);
        }, 3000);
    }
}

// 전역 인스턴스 생성
let fileManager;
document.addEventListener('DOMContentLoaded', () => {
    fileManager = new FileManager();
});