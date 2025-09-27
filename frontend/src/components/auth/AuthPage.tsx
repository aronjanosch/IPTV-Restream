import React, { useState } from 'react';
import { Radio } from 'lucide-react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const handleClose = () => {
    // No-op for fullscreen mode
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <Radio className="w-12 h-12 text-blue-500" />
            <h1 className="text-3xl font-bold">StreamHub</h1>
          </div>
          <p className="text-gray-400">
            {mode === 'login' ? 'Welcome back' : 'Get started today'}
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-gray-800 rounded-lg p-6">
          {mode === 'login' ? (
            <LoginForm
              onSwitchToRegister={() => setMode('register')}
              onClose={handleClose}
            />
          ) : (
            <RegisterForm
              onSwitchToLogin={() => setMode('login')}
              onClose={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;