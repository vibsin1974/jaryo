const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseHelper {
    constructor() {
        // 프로젝트 루트의 data 디렉토리에 데이터베이스 저장
        const projectRoot = path.resolve(__dirname, '..');
        this.dbPath = path.join(projectRoot, 'data', 'jaryo.db');
        this.db = null;
    }

    // 데이터베이스 연결
    connect() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }

            // 데이터베이스 디렉토리 생성
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // 데이터베이스 파일이 없으면 생성
            const flags = fs.existsSync(this.dbPath) ? 
                sqlite3.OPEN_READWRITE : 
                sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE;

            this.db = new sqlite3.Database(this.dbPath, flags, (err) => {
                if (err) {
                    console.error('데이터베이스 연결 오류:', err.message);
                    reject(err);
                } else {
                    console.log('✅ SQLite 데이터베이스 연결됨:', this.dbPath);
                    this.initializeTables().then(() => {
                        resolve(this.db);
                    }).catch(reject);
                }
            });
        });
    }

    // 데이터베이스 연결 종료
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        this.db = null;
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    // 테이블 초기화
    initializeTables() {
        return new Promise((resolve, reject) => {
            const createTables = `
                -- 사용자 테이블
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    name TEXT NOT NULL,
                    role TEXT DEFAULT 'user',
                    is_active INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME
                );

                -- 카테고리 테이블
                CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- 파일 테이블
                CREATE TABLE IF NOT EXISTS files (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT,
                    category TEXT NOT NULL,
                    tags TEXT DEFAULT '[]',
                    user_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );

                -- 첨부파일 테이블
                CREATE TABLE IF NOT EXISTS file_attachments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_id TEXT NOT NULL,
                    original_name TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_size INTEGER NOT NULL,
                    mime_type TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
                );

                -- 사용자 세션 테이블 (옵션)
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
            `;

            this.db.exec(createTables, (err) => {
                if (err) {
                    console.error('테이블 생성 오류:', err);
                    reject(err);
                } else {
                    console.log('✅ 데이터베이스 테이블 초기화 완료');
                    resolve();
                }
            });
        });
    }

    // 모든 파일 목록 가져오기
    async getAllFiles(limit = 100, offset = 0) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            // 더 간단한 쿼리로 변경 - 첨부파일은 별도 쿼리로 처리
            const query = `
                SELECT * FROM files 
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `;
            
            this.db.all(query, [limit, offset], async (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const files = [];
                
                for (const row of rows) {
                    const file = {
                        id: row.id,
                        title: row.title,
                        description: row.description,
                        category: row.category,
                        tags: row.tags ? JSON.parse(row.tags) : [],
                        user_id: row.user_id,
                        created_at: row.created_at,
                        updated_at: row.updated_at,
                        files: []
                    };
                    
                    // 각 파일의 첨부파일을 별도로 조회
                    try {
                        const attachments = await this.getFileAttachments(row.id);
                        file.files = attachments;
                    } catch (attachmentError) {
                        console.warn('첨부파일 조회 오류:', attachmentError);
                        file.files = [];
                    }
                    
                    files.push(file);
                }
                
                resolve(files);
            });
        });
    }

    // 파일의 첨부파일 목록 가져오기
    async getFileAttachments(fileId) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM file_attachments WHERE file_id = ?';
            this.db.all(query, [fileId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const attachments = rows.map(row => ({
                        id: row.id,
                        original_name: row.original_name,
                        file_name: row.file_name,
                        file_path: row.file_path,
                        file_size: row.file_size,
                        mime_type: row.mime_type,
                        name: row.original_name, // 호환성을 위해
                        size: row.file_size      // 호환성을 위해
                    }));
                    resolve(attachments);
                }
            });
        });
    }

    // 파일 검색
    async searchFiles(searchTerm, category = null, limit = 100) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            let query = `
                SELECT * FROM files 
                WHERE (title LIKE ? OR description LIKE ? OR tags LIKE ?)
            `;
            
            const params = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];
            
            if (category) {
                query += ' AND category = ?';
                params.push(category);
            }
            
            query += ' ORDER BY created_at DESC LIMIT ?';
            params.push(limit);
            
            this.db.all(query, params, async (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const files = [];
                
                for (const row of rows) {
                    const file = {
                        id: row.id,
                        title: row.title,
                        description: row.description,
                        category: row.category,
                        tags: row.tags ? JSON.parse(row.tags) : [],
                        user_id: row.user_id,
                        created_at: row.created_at,
                        updated_at: row.updated_at,
                        files: []
                    };
                    
                    // 각 파일의 첨부파일을 별도로 조회
                    try {
                        const attachments = await this.getFileAttachments(row.id);
                        file.files = attachments;
                    } catch (attachmentError) {
                        console.warn('첨부파일 조회 오류:', attachmentError);
                        file.files = [];
                    }
                    
                    files.push(file);
                }
                
                resolve(files);
            });
        });
    }

    // 새 파일 추가
    async addFile(fileData) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO files (id, title, description, category, tags, user_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const params = [
                fileData.id || this.generateId(),
                fileData.title,
                fileData.description || '',
                fileData.category,
                JSON.stringify(fileData.tags || []),
                fileData.user_id || 'offline-user'
            ];
            
            this.db.run(query, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: params[0], changes: this.changes });
                }
            });
        });
    }

    // 파일 정보 수정
    async updateFile(id, updates) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const setClause = [];
            const params = [];
            
            if (updates.title !== undefined) {
                setClause.push('title = ?');
                params.push(updates.title);
            }
            if (updates.description !== undefined) {
                setClause.push('description = ?');
                params.push(updates.description);
            }
            if (updates.category !== undefined) {
                setClause.push('category = ?');
                params.push(updates.category);
            }
            if (updates.tags !== undefined) {
                setClause.push('tags = ?');
                params.push(JSON.stringify(updates.tags));
            }
            
            setClause.push('updated_at = CURRENT_TIMESTAMP');
            params.push(id);
            
            const query = `UPDATE files SET ${setClause.join(', ')} WHERE id = ?`;
            
            this.db.run(query, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // 파일 삭제
    async deleteFile(id) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            // 첨부파일부터 삭제 (CASCADE가 있지만 명시적으로)
            this.db.run('DELETE FROM file_attachments WHERE file_id = ?', [id], (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // 파일 정보 삭제
                this.db.run('DELETE FROM files WHERE id = ?', [id], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ changes: this.changes });
                    }
                });
            });
        });
    }

    // 첨부파일 추가
    async addFileAttachment(fileId, attachmentData) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO file_attachments (file_id, original_name, file_name, file_path, file_size, mime_type)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const params = [
                fileId,
                attachmentData.original_name,
                attachmentData.file_name || attachmentData.original_name,
                attachmentData.file_path || '',
                attachmentData.file_size || 0,
                attachmentData.mime_type || ''
            ];
            
            this.db.run(query, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // 첨부파일 삭제
    async deleteFileAttachment(attachmentId) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM file_attachments WHERE id = ?';
            
            this.db.run(query, [attachmentId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // 카테고리 목록 가져오기
    async getCategories() {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM categories ORDER BY name ASC';
            
            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // 카테고리 추가
    async addCategory(name) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO categories (name) VALUES (?)';
            
            this.db.run(query, [name], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // 카테고리 수정
    async updateCategory(id, name) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const query = 'UPDATE categories SET name = ? WHERE id = ?';
            
            this.db.run(query, [name, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // 카테고리 삭제
    async deleteCategory(id) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            // 해당 카테고리를 사용하는 파일들을 '기타'로 변경
            this.db.serialize(() => {
                this.db.run('UPDATE files SET category = "기타" WHERE category = (SELECT name FROM categories WHERE id = ?)', [id], (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    // 카테고리 삭제
                    this.db.run('DELETE FROM categories WHERE id = ?', [id], function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({ changes: this.changes });
                        }
                    });
                });
            });
        });
    }

    // 통계 정보 가져오기
    async getStats() {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const queries = [
                'SELECT COUNT(*) as total_files FROM files',
                'SELECT category, COUNT(*) as count FROM files GROUP BY category',
                'SELECT COUNT(*) as total_attachments FROM file_attachments'
            ];
            
            Promise.all(queries.map(query => 
                new Promise((res, rej) => {
                    this.db.all(query, [], (err, rows) => {
                        if (err) rej(err);
                        else res(rows);
                    });
                })
            )).then(results => {
                resolve({
                    total_files: results[0][0].total_files,
                    by_category: results[1],
                    total_attachments: results[2][0].total_attachments
                });
            }).catch(reject);
        });
    }

    // 사용자 관련 메서드들
    async getUserByEmail(email) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM users WHERE email = ? AND is_active = 1';
            this.db.get(query, [email], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async getUserById(id) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM users WHERE id = ? AND is_active = 1';
            this.db.get(query, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async createUser(userData) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO users (id, email, password_hash, name, role)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            const userId = this.generateId();
            const params = [
                userId,
                userData.email,
                userData.password_hash,
                userData.name,
                userData.role || 'user'
            ];
            
            this.db.run(query, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: userId, changes: this.changes });
                }
            });
        });
    }

    async updateUserLastLogin(userId) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const query = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
            this.db.run(query, [userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    async createSession(userId, sessionId, expiresAt) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO user_sessions (id, user_id, expires_at)
                VALUES (?, ?, ?)
            `;
            
            this.db.run(query, [sessionId, userId, expiresAt], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: sessionId, changes: this.changes });
                }
            });
        });
    }

    async getSession(sessionId) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const query = `
                SELECT s.*, u.id as user_id, u.email, u.name, u.role 
                FROM user_sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.id = ? AND s.expires_at > datetime('now') AND u.is_active = 1
            `;
            
            this.db.get(query, [sessionId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async deleteSession(sessionId) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM user_sessions WHERE id = ?';
            this.db.run(query, [sessionId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    async cleanExpiredSessions() {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM user_sessions WHERE expires_at <= datetime("now")';
            this.db.run(query, [], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // ID 생성 헬퍼
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
}

module.exports = DatabaseHelper;