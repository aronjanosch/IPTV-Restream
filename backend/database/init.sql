-- User authentication database schema
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NULL,          -- NULL for SSO-only users
  name TEXT NOT NULL,
  username TEXT NULL,               -- Optional username for display
  avatar TEXT NULL,                 -- Optional avatar URL
  role TEXT DEFAULT 'user',         -- 'admin' or 'user'
  sso_provider TEXT NULL,           -- NULL for local users
  sso_id TEXT NULL,                 -- Provider user ID
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME NULL
);

-- Note: username and avatar columns are already included in the table creation above

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_sso_provider_id ON users(sso_provider, sso_id);