import React, { useState, useEffect, useContext } from 'react';
import { Radio, LogIn } from 'lucide-react';
import { useUser } from '../admin/AdminContext';
import { ToastContext } from '../notifications/ToastContext';
import apiService from '../../services/ApiService';

function LoginPage() {
  const { login } = useUser();
  const { addToast } = useContext(ToastContext);
  const [loginField, setLoginField] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oidcEnabled, setOidcEnabled] = useState(false);

  useEffect(() => {
    apiService
      .request<{ oidcEnabled: boolean }>('/auth/config')
      .then((data) => setOidcEnabled(data.oidcEnabled))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiService.request<{ success: boolean; token?: string }>(
        '/auth/login',
        'POST',
        undefined,
        { login: loginField, password }
      );
      if (res.success && res.token) {
        login(res.token);
      } else {
        addToast({ type: 'error', title: 'Invalid credentials', duration: 3000 });
      }
    } catch {
      addToast({ type: 'error', title: 'Login failed', message: 'Please try again', duration: 3000 });
    } finally {
      setLoading(false);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center space-x-3 mb-8">
          <Radio className="w-10 h-10 text-blue-500" />
          <h1 className="text-3xl font-bold text-white">StreamHub</h1>
        </div>

        <div className="bg-gray-800 rounded-xl shadow-2xl p-8 space-y-6">
          <h2 className="text-xl font-semibold text-center text-white">Sign in</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Username or Email
              </label>
              <input
                type="text"
                value={loginField}
                onChange={(e) => setLoginField(e.target.value)}
                className="w-full bg-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter username or email"
                required
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter password"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Signing in…' : 'Sign in'}</span>
            </button>
          </form>

          {oidcEnabled && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-800 text-gray-400">or</span>
                </div>
              </div>

              <button
                onClick={() => { window.location.href = '/api/auth/login'; }}
                className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Continue with SSO</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
