import React from 'react';
import { User, LogOut, Shield, UserIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  if (!isOpen || !user) return null;

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-100">{user.name}</h2>
            <p className="text-gray-400">{user.email}</p>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              {user.role === 'admin' ? (
                <Shield className="w-5 h-5 text-yellow-500" />
              ) : (
                <User className="w-5 h-5 text-blue-500" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-300">Role</p>
                <p className="text-gray-100 capitalize">{user.role}</p>
              </div>
            </div>
          </div>

          {user.role === 'admin' && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-yellow-400 text-sm">
                <Shield className="w-4 h-4 inline mr-1" />
                You have administrator privileges
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>

            <button
              onClick={onClose}
              className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;