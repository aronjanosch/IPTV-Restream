const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

class User {
  constructor() {
    this.dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/users.db');
    this.initDatabase();
  }

  initDatabase() {
    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new sqlite3.Database(this.dbPath);

    // Read and execute schema
    const schemaPath = path.join(__dirname, '../database/init.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    this.db.exec(schema, (err) => {
      if (err) {
        console.error('Error initializing database:', err);
      } else {
        console.log('Database initialized successfully');
      }
    });
  }

  // Create a new user
  async create(userData) {
    return new Promise((resolve, reject) => {
      const { email, password, name, username = null, avatar = null, role = 'user', ssoProvider = null, ssoId = null } = userData;

      // Check if this is the first user (should be admin)
      this.db.get('SELECT COUNT(*) as count FROM users', async (err, row) => {
        if (err) return reject(err);

        const isFirstUser = row.count === 0;
        const userRole = isFirstUser ? 'admin' : role;

        let passwordHash = null;
        if (password) {
          passwordHash = await bcrypt.hash(password, 12);
        }

        this.db.run(
          `INSERT INTO users (email, password_hash, name, username, avatar, role, sso_provider, sso_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [email, passwordHash, name, username, avatar, userRole, ssoProvider, ssoId],
          function(err) {
            if (err) return reject(err);
            resolve({ id: this.lastID, email, name, username, avatar, role: userRole });
          }
        );
      });
    });
  }

  // Find user by email
  async findByEmail(email) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        }
      );
    });
  }

  // Find user by ID
  async findById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE id = ?',
        [id],
        (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        }
      );
    });
  }

  // Find user by SSO provider and ID
  async findBySSOId(provider, ssoId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE sso_provider = ? AND sso_id = ?',
        [provider, ssoId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        }
      );
    });
  }

  // Verify password
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // Update last login
  async updateLastLogin(id) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [id],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  // Link SSO account to existing user
  async linkSSO(userId, provider, ssoId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE users SET sso_provider = ?, sso_id = ? WHERE id = ?',
        [provider, ssoId, userId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  // Get all users (admin only)
  async getAll() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT id, email, name, username, avatar, role, sso_provider, created_at, last_login FROM users ORDER BY created_at DESC',
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  }

  // Update user role (admin only)
  async updateRole(userId, role) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE users SET role = ? WHERE id = ?',
        [role, userId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  // Get user count (for setup check)
  async getUserCount() {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(*) as count FROM users',
        (err, row) => {
          if (err) return reject(err);
          resolve(row.count);
        }
      );
    });
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = new User();