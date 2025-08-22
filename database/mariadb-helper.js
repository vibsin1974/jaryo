const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

class MariaDBHelper {
    constructor() {
        this.connection = null;
        
        // 환경별 설정 지원
        const isWindows = process.platform === 'win32';
        const isNAS = process.env.NODE_ENV === 'production' || process.env.DEPLOY_ENV === 'nas';
        
        if (isWindows) {
            // Windows 개발 환경 (NAS MariaDB 원격 접속)
            this.config = {
                host: process.env.DB_HOST || '119.64.1.86',
                port: process.env.DB_PORT || 3306,
                user: process.env.DB_USER || 'jaryo_user',
                password: process.env.DB_PASSWORD || 'JaryoPass2024!@#',
                database: process.env.DB_NAME || 'jaryo',
                charset: 'utf8mb4'
            };
        } else if (isNAS) {
            // 시놀로지 NAS 환경 (Unix Socket)
            this.config = {
                socketPath: '/run/mysqld/mysqld10.sock',
                user: 'jaryo_user',
                password: 'JaryoPass2024!@#',
                database: 'jaryo',
                charset: 'utf8mb4'
            };
        } else {
            // 기타 Linux 환경
            this.config = {
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 3306,
                user: process.env.DB_USER || 'jaryo_user',
                password: process.env.DB_PASSWORD || 'JaryoPass2024!@#',
                database: process.env.DB_NAME || 'jaryo',
                charset: 'utf8mb4'
            };
        }
    }

    async connect() {
        try {
            if (!this.connection || this.connection.connection._closing) {
                this.connection = await mysql.createConnection(this.config);
                
                const connectionType = this.config.socketPath ? 'Unix Socket' : `TCP ${this.config.host}:${this.config.port}`;
                console.log(`✅ MariaDB 연결 성공 (${connectionType})`);
            }
            return this.connection;
        } catch (error) {
            console.error('❌ MariaDB 연결 실패:', error);
            console.error('연결 설정:', { ...this.config, password: '***' });
            throw error;
        }
    }

    async close() {
        if (this.connection) {
            await this.connection.end();
            this.connection = null;
            console.log('📝 MariaDB 연결 종료');
        }
    }

    generateId() {
        return uuidv4();
    }

    // 사용자 관리
    async createUser(userData) {
        const conn = await this.connect();
        const id = this.generateId();
        const [result] = await conn.execute(
            'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)',
            [id, userData.email, userData.password_hash, userData.name, userData.role || 'user']
        );
        return { id, ...result };
    }

    async getUserByEmail(email) {
        const conn = await this.connect();
        const [rows] = await conn.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return rows[0] || null;
    }

    async getUserById(id) {
        const conn = await this.connect();
        const [rows] = await conn.execute(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    }

    async updateUserLastLogin(id) {
        const conn = await this.connect();
        const [result] = await conn.execute(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
        return result;
    }

    // 파일 관리
    async addFile(fileData) {
        const conn = await this.connect();
        const [result] = await conn.execute(
            'INSERT INTO files (id, title, description, category, tags, user_id) VALUES (?, ?, ?, ?, ?, ?)',
            [fileData.id, fileData.title, fileData.description, fileData.category, JSON.stringify(fileData.tags), fileData.user_id]
        );
        return result;
    }

    async getAllFiles(limit = 100, offset = 0) {
        const conn = await this.connect();
        const [rows] = await conn.execute(
            'SELECT f.*, u.name as user_name FROM files f LEFT JOIN users u ON f.user_id = u.id ORDER BY f.created_at DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );
        
        // Parse tags from JSON
        return rows.map(row => ({
            ...row,
            tags: row.tags ? JSON.parse(row.tags) : []
        }));
    }

    async searchFiles(searchTerm, category = null, limit = 100) {
        const conn = await this.connect();
        let query = 'SELECT f.*, u.name as user_name FROM files f LEFT JOIN users u ON f.user_id = u.id WHERE (f.title LIKE ? OR f.description LIKE ?)';
        let params = [`%${searchTerm}%`, `%${searchTerm}%`];

        if (category) {
            query += ' AND f.category = ?';
            params.push(category);
        }

        query += ' ORDER BY f.created_at DESC LIMIT ?';
        params.push(limit);

        const [rows] = await conn.execute(query, params);
        
        return rows.map(row => ({
            ...row,
            tags: row.tags ? JSON.parse(row.tags) : []
        }));
    }

    async updateFile(id, updates) {
        const conn = await this.connect();
        const [result] = await conn.execute(
            'UPDATE files SET title = ?, description = ?, category = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [updates.title, updates.description, updates.category, updates.tags, id]
        );
        return result;
    }

    async deleteFile(id) {
        const conn = await this.connect();
        const [result] = await conn.execute('DELETE FROM files WHERE id = ?', [id]);
        return result;
    }

    // 파일 첨부 관리
    async addFileAttachment(fileId, attachmentData) {
        const conn = await this.connect();
        const [result] = await conn.execute(
            'INSERT INTO file_attachments (file_id, original_name, file_name, file_path, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?)',
            [fileId, attachmentData.original_name, attachmentData.file_name, attachmentData.file_path, attachmentData.file_size, attachmentData.mime_type]
        );
        return result;
    }

    async getFileAttachments(fileId) {
        const conn = await this.connect();
        const [rows] = await conn.execute(
            'SELECT * FROM file_attachments WHERE file_id = ? ORDER BY created_at',
            [fileId]
        );
        return rows;
    }

    async deleteFileAttachment(attachmentId) {
        const conn = await this.connect();
        const [result] = await conn.execute('DELETE FROM file_attachments WHERE id = ?', [attachmentId]);
        return result;
    }

    // 카테고리 관리
    async getCategories() {
        const conn = await this.connect();
        const [rows] = await conn.execute('SELECT * FROM categories ORDER BY name');
        return rows;
    }

    async addCategory(name) {
        const conn = await this.connect();
        const [result] = await conn.execute('INSERT INTO categories (name) VALUES (?)', [name]);
        return result;
    }

    async updateCategory(id, name) {
        const conn = await this.connect();
        const [result] = await conn.execute('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
        return result;
    }

    async deleteCategory(id) {
        const conn = await this.connect();
        const [result] = await conn.execute('DELETE FROM categories WHERE id = ?', [id]);
        return result;
    }

    // 통계
    async getStats() {
        const conn = await this.connect();
        
        const [userCount] = await conn.execute('SELECT COUNT(*) as count FROM users');
        const [fileCount] = await conn.execute('SELECT COUNT(*) as count FROM files');
        const [categoryCount] = await conn.execute('SELECT COUNT(*) as count FROM categories');
        const [attachmentCount] = await conn.execute('SELECT COUNT(*) as count FROM file_attachments');
        
        return {
            users: userCount[0].count,
            files: fileCount[0].count,
            categories: categoryCount[0].count,
            attachments: attachmentCount[0].count
        };
    }
}

module.exports = MariaDBHelper;