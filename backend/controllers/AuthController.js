require('dotenv').config();

const ADMIN_ENABLED = process.env.ADMIN_ENABLED === 'true';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

module.exports = {
  adminLogin(req, res) {
    if (!ADMIN_ENABLED || ADMIN_PASSWORD === undefined) {
      return res.status(403).json({ 
        success: false,
        message: 'Admin mode is disabled on this server' 
      });
    }

    const { password } = req.body;

    if (password === ADMIN_PASSWORD) {
      return res.json({ success: true });
    } else {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid password' 
      });
    }
  },

  checkAdminStatus(req, res) {
    res.json({ 
      enabled: ADMIN_ENABLED 
    });
  }
};