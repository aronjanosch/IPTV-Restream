import React, { useContext } from 'react';
import { X, Shield, ShieldOff, LogIn } from 'lucide-react';
import { ToastContext } from '../notifications/ToastContext';
import { useAdmin } from './AdminContext';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function AdminModal({ isOpen, onClose }: AdminModalProps) {
  const { isAdmin, setIsAdmin } = useAdmin();
  const { addToast } = useContext(ToastContext);

  if (!isOpen) return null;

  const handleLogin = () => {
    // Navigate to backend OIDC login — backend will redirect to Authentik
    window.location.href = '/api/auth/login';
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAdmin(false);
    addToast({
      type: 'info',
      title: 'Logged out',
      duration: 3000,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            {isAdmin ? (
              <Shield className="w-5 h-5 text-green-500" />
            ) : (
              <ShieldOff className="w-5 h-5 text-blue-500" />
            )}
            <h2 className="text-xl font-semibold">Admin Mode</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {isAdmin ? (
            <div className="space-y-4">
              <p className="text-green-500">You are currently in admin mode.</p>
              <button
                onClick={handleLogout}
                className="w-full p-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                Sign in with your identity provider to enable admin access.
              </p>
              <button
                onClick={handleLogin}
                className="w-full p-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Login with SSO</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminModal;
