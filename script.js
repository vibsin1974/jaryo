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
        
        // 정렬
        const sortedFiles = [...this.filteredFiles].sort((a, b) => {
            switch (sortBy) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'category':
                    return a.category.localeCompare(b.category);
                case 'date':
                default:
                    return new Date(b.createdAt) - new Date(a.createdAt);
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
                        `<div class="attachment-icons" title="${file.files.length}개 파일">${file.files.map((f, index) => 
                            `<span class="attachment-icon-clickable" onclick="fileManager.downloadSingleFile('${file.id}', ${index})" title="${f.name || f.original_name || '파일'}">${this.getFileIcon(f.name || f.original_name || 'unknown')}</span>`
                        ).join(' ')}</div>` : 
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

    viewFileInfo(id) {
        const file = this.files.find(f => f.id === id);
        if (!file) return;

        let info = `📋 자료 정보\n\n`;
        info += `📌 제목: ${file.title}\n`;
        info += `📂 카테고리: ${file.category}\n`;
        info += `📅 등록일: ${new Date(file.created_at || file.createdAt).toLocaleDateString('ko-KR')}\n`;
        if (file.description) info += `📝 설명: ${file.description}\n`;
        if (file.tags && file.tags.length > 0) info += `🏷️ 태그: ${file.tags.join(', ')}\n`;
        if (file.files && file.files.length > 0) {
            info += `\n📎 첨부파일 (${file.files.length}개):\n`;
            file.files.forEach((attachment, index) => {
                const icon = this.getFileIcon(attachment.name || attachment.original_name || 'unknown');
                info += `  ${index + 1}. ${icon} ${attachment.name || attachment.original_name || '파일'}\n`;
            });
        }
        
        alert(info);
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
        const totalPages = Math.ceil(this.filteredFiles.length / this.itemsPerPage);
        const pagination = document.getElementById('pagination');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const pageInfo = document.getElementById('pageInfo');
        
        if (totalPages <= 1) {
            pagination.style.display = 'none';
        } else {
            pagination.style.display = 'flex';
            prevBtn.disabled = this.currentPage <= 1;
            nextBtn.disabled = this.currentPage >= totalPages;
            pageInfo.textContent = `${this.currentPage} / ${totalPages}`;
        }
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
            return stored ? JSON.parse(stored) : [];
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