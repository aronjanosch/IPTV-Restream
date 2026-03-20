import React, { useState } from 'react';
import { X, Shield, User, LogOut } from 'lucide-react';
import { useUser } from './AdminContext';
import UserManagement from './UserManagement';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function AdminModal({ isOpen, onClose }: AdminModalProps) {
  const { username, email, role, isAdmin, logout } = useUser();
  const [showUserManagement, setShowUserManagement] = useState(false);

  if (!isOpen) return null;

  const handleLogout = () => {
    logout();
    onClose();
  };

  if (showUserManagement) {
    return <UserManagement onClose={() => setShowUserManagement(false)} />;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            {isAdmin ? (
              <Shield className="w-5 h-5 text-green-500" />
            ) : (
              <User className="w-5 h-5 text-blue-500" />
            )}
            <h2 className="text-lg font-semibold">Account</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-400">Signed in as</p>
            <p className="font-semibold text-white">{username}</p>
            <p className="text-sm text-gray-400">{email}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
              isAdmin
                ? 'bg-green-900 text-green-300 border border-green-700'
                : 'bg-gray-700 text-gray-300'
            }`}>
              {role}
            </span>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowUserManagement(true)}
              className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <Shield className="w-4 h-4 text-green-400" />
              <span>Manage Users</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminModal;
