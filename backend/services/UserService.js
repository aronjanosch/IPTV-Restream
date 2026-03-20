const bcrypt = require('bcrypt');
const { db } = require('../database');

const BCRYPT_ROUNDS = 12;

const UserService = {
  async create({ username, email, password, role = 'user', oidcSub = null }) {
    const hash = password ? await bcrypt.hash(password, BCRYPT_ROUNDS) : null;
    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash, role, oidc_sub) VALUES (?, ?, ?, ?, ?)'
    ).run(username, email.toLowerCase(), hash, role, oidcSub);
    return UserService.findById(result.lastInsertRowid);
  },

  findById(id) {
    return db.prepare('SELECT id, username, email, role, oidc_sub, created_at FROM users WHERE id = ?').get(id) || null;
  },

  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) || null;
  },

  findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username) || null;
  },

  findByOidcSub(sub) {
    return db.prepare('SELECT * FROM users WHERE oidc_sub = ?').get(sub) || null;
  },

  list() {
    return db.prepare('SELECT id, username, email, role, created_at FROM users ORDER BY created_at ASC').all();
  },

  update(id, { username, email, role }) {
    const fields = [];
    const values = [];
    if (username !== undefined) { fields.push('username = ?'); values.push(username); }
    if (email    !== undefined) { fields.push('email = ?');    values.push(email.toLowerCase()); }
    if (role     !== undefined) { fields.push('role = ?');     values.push(role); }
    if (!fields.length) return UserService.findById(id);
    values.push(id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return UserService.findById(id);
  },

  async resetPassword(id, newPassword) {
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
  },

  linkOidcSub(id, sub) {
    db.prepare('UPDATE users SET oidc_sub = ? WHERE id = ?').run(sub, id);
  },

  delete(id) {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  },

  async verifyPassword(user, password) {
    if (!user || !user.password_hash) return false;
    return bcrypt.compare(password, user.password_hash);
  },

  count() {
    return db.prepare('SELECT COUNT(*) AS cnt FROM users').get().cnt;
  },
};

module.exports = UserService;
