const UserService = require('../services/UserService');

function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
}

module.exports = {
  requireAdmin,

  // GET /api/users
  list(req, res) {
    const users = UserService.list();
    res.json(users);
  },

  // POST /api/users  { username, email, password, role }
  async create(req, res) {
    const { username, email, password, role = 'user' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'username, email and password are required.' });
    }
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ success: false, message: 'role must be "admin" or "user".' });
    }

    try {
      const user = await UserService.create({ username, email, password, role });
      res.status(201).json(user);
    } catch (err) {
      if (err.message?.includes('UNIQUE')) {
        return res.status(409).json({ success: false, message: 'Username or email already exists.' });
      }
      console.error('Create user error:', err);
      res.status(500).json({ success: false, message: 'Failed to create user.' });
    }
  },

  // PUT /api/users/:id  { username?, email?, role?, password? }
  async update(req, res) {
    const id = parseInt(req.params.id, 10);
    const { username, email, role, password } = req.body;

    // Prevent removing the last admin
    if (role === 'user') {
      const current = UserService.findById(id);
      if (current?.role === 'admin') {
        const admins = UserService.list().filter(u => u.role === 'admin');
        if (admins.length <= 1) {
          return res.status(400).json({ success: false, message: 'Cannot remove the last admin.' });
        }
      }
    }

    try {
      if (password) await UserService.resetPassword(id, password);
      const user = UserService.update(id, { username, email, role });
      if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
      res.json(user);
    } catch (err) {
      if (err.message?.includes('UNIQUE')) {
        return res.status(409).json({ success: false, message: 'Username or email already exists.' });
      }
      console.error('Update user error:', err);
      res.status(500).json({ success: false, message: 'Failed to update user.' });
    }
  },

  // DELETE /api/users/:id
  delete(req, res) {
    const id = parseInt(req.params.id, 10);

    // Prevent deleting yourself
    if (req.user.userId === id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account.' });
    }

    // Prevent removing the last admin
    const target = UserService.findById(id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

    if (target.role === 'admin') {
      const admins = UserService.list().filter(u => u.role === 'admin');
      if (admins.length <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot delete the last admin.' });
      }
    }

    UserService.delete(id);
    res.json({ success: true });
  },
};
