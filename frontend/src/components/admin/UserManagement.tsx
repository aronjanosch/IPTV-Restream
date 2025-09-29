import React, { useState, useEffect, useCallback } from 'react';
import { X, Users, Shield, ShieldCheck, Calendar, Clock, UserCheck } from 'lucide-react';
import apiService from '../../services/ApiService';
import { useToast } from '../notifications/ToastContext';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
  sso_provider: string | null;
  created_at: string;
  last_login: string | null;
}

interface UserManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

function UserManagement({ isOpen, onClose }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const { addToast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.request('/auth/users', 'GET', import.meta.env.VITE_BACKEND_URL || '');
      setUsers(response.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      addToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

  const updateUserRole = async (userId: number, newRole: 'admin' | 'user') => {
    setUpdatingUserId(userId);
    try {
      await apiService.request(`/auth/users/${userId}/role`, 'PUT', import.meta.env.VITE_BACKEND_URL || '', { role: newRole });

      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );

      addToast(`User role updated to ${newRole}`, 'success');
    } catch (error) {
      console.error('Error updating user role:', error);
      addToast('Failed to update user role', 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAuthenticationMethod = (user: User) => {
    return user.sso_provider ? `SSO (${user.sso_provider})` : 'Local';
  };

  const getRoleIcon = (role: 'admin' | 'user') => {
    return role === 'admin' ? (
      <ShieldCheck className="w-4 h-4 text-blue-500" />
    ) : (
      <Shield className="w-4 h-4 text-gray-400" />
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold">User Management</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="w-8 h-8 text-blue-500 mx-auto mb-2 animate-pulse" />
                <p className="text-gray-400">Loading users...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stats Bar */}
              <div className="px-6 py-4 bg-gray-750 border-b border-gray-700">
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-green-500" />
                    <span className="text-gray-300">
                      Total Users: <span className="font-semibold text-white">{users.length}</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-300">
                      Admins: <span className="font-semibold text-white">
                        {users.filter(user => user.role === 'admin').length}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">
                      Users: <span className="font-semibold text-white">
                        {users.filter(user => user.role === 'user').length}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* User List */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  {users.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No users found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className="bg-gray-750 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                {getRoleIcon(user.role)}
                                <div>
                                  <h3 className="font-semibold text-white">{user.name}</h3>
                                  <p className="text-sm text-gray-400">{user.email}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div className="flex items-center space-x-2">
                                  <Calendar className="w-4 h-4 text-gray-500" />
                                  <div>
                                    <p className="text-gray-500">Joined</p>
                                    <p className="text-gray-300">{formatDate(user.created_at)}</p>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4 text-gray-500" />
                                  <div>
                                    <p className="text-gray-500">Last Login</p>
                                    <p className="text-gray-300">{formatDate(user.last_login)}</p>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <UserCheck className="w-4 h-4 text-gray-500" />
                                  <div>
                                    <p className="text-gray-500">Auth Method</p>
                                    <p className="text-gray-300">{getAuthenticationMethod(user)}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 ml-4">
                              <select
                                value={user.role}
                                onChange={(e) => updateUserRole(user.id, e.target.value as 'admin' | 'user')}
                                disabled={updatingUserId === user.id}
                                className="bg-gray-700 border border-gray-600 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>

                              {updatingUserId === user.id && (
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-700 bg-gray-750">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;