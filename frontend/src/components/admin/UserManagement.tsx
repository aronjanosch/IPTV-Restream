import React, { useState, useEffect, useContext } from 'react';
import { X, Plus, Trash2, ChevronLeft, Shield, User } from 'lucide-react';
import { ToastContext } from '../notifications/ToastContext';
import apiService from '../../services/ApiService';

interface UserRecord {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: number;
}

interface CreateForm {
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
}

const EMPTY_FORM: CreateForm = { username: '', email: '', password: '', role: 'user' };

interface Props {
  onClose: () => void;
}

export default function UserManagement({ onClose }: Props) {
  const { addToast } = useContext(ToastContext);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadUsers = () => {
    setLoading(true);
    apiService
      .request<UserRecord[]>('/users')
      .then(setUsers)
      .catch(() => addToast({ type: 'error', title: 'Failed to load users', duration: 3000 }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiService.request('/users', 'POST', undefined, form);
      addToast({ type: 'success', title: `User "${form.username}" created`, duration: 3000 });
      setForm(EMPTY_FORM);
      setShowCreate(false);
      loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create user';
      addToast({ type: 'error', title: msg, duration: 4000 });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRole = async (user: UserRecord) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await apiService.request(`/users/${user.id}`, 'PUT', undefined, { role: newRole });
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update role';
      addToast({ type: 'error', title: msg, duration: 4000 });
    }
  };

  const handleDelete = async (user: UserRecord) => {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    try {
      await apiService.request(`/users/${user.id}`, 'DELETE');
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      addToast({ type: 'info', title: `User "${user.username}" deleted`, duration: 3000 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user';
      addToast({ type: 'error', title: msg, duration: 4000 });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-lg transition-colors mr-1">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <Shield className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold">Manage Users</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <p className="text-gray-400 text-sm text-center py-4">Loading…</p>
          ) : users.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No users yet.</p>
          ) : (
            users.map((user) => (
              <div key={user.id} className="flex items-center justify-between bg-gray-700 rounded-lg px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    {user.role === 'admin'
                      ? <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />
                      : <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    }
                    <span className="font-medium truncate">{user.username}</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate pl-6">{user.email}</p>
                </div>
                <div className="flex items-center space-x-2 ml-2">
                  <button
                    onClick={() => handleToggleRole(user)}
                    title={user.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                    className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                      user.role === 'admin'
                        ? 'border-green-600 text-green-400 hover:bg-green-900'
                        : 'border-gray-500 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {user.role}
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    className="p-1.5 hover:bg-red-800 rounded-lg transition-colors text-red-400"
                    title="Delete user"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create user form */}
        <div className="border-t border-gray-700 p-4">
          {showCreate ? (
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                />
                <input
                  type="email"
                  className="bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
                <input
                  type="password"
                  className="bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <select
                  className="bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as 'user' | 'admin' })}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Creating…' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
