import { X, Clock, Shield, Users, Database, Server, Info, Key, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import apiService from '../services/ApiService';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncEnabled: boolean;
  onSyncChange: (enabled: boolean) => void;
}

interface AdminStats {
  totalUsers: number;
  adminCount: number;
  userCount: number;
  ssoEnabled: boolean;
  totalChannels?: number;
}

interface OIDCConfig {
  enabled: boolean;
  issuerUrl: string;
  clientId: string;
  callbackUrl: string;
  autoProvision: boolean;
  roleMapping: boolean;
}

function SettingsModal({ isOpen, onClose, syncEnabled, onSyncChange }: SettingsModalProps) {
  const { user, authenticated } = useAuth();
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [oidcConfig, setOidcConfig] = useState<OIDCConfig | null>(null);
  const [oidcLoading, setOidcLoading] = useState(false);
  const [oidcSaving, setOidcSaving] = useState(false);
  const [oidcTesting, setOidcTesting] = useState(false);
  const [oidcTestResult, setOidcTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [showOidcForm, setShowOidcForm] = useState(false);

  useEffect(() => {
    if (isOpen && authenticated && user?.role === 'admin') {
      fetchAdminStats();
      fetchOidcConfig();
    }
  }, [isOpen, authenticated, user]);

  const fetchAdminStats = async () => {
    setLoading(true);
    try {
      const response = await apiService.request('/auth/users', 'GET', import.meta.env.VITE_BACKEND_URL || '');
      const users = response.users;
      const channelsResponse = await apiService.request('/channels/', 'GET');

      setAdminStats({
        totalUsers: users.length,
        adminCount: users.filter((u: User) => u.role === 'admin').length,
        userCount: users.filter((u: User) => u.role === 'user').length,
        ssoEnabled: process.env.VITE_SSO_ENABLED === 'true' || false,
        totalChannels: channelsResponse.length
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOidcConfig = async () => {
    setOidcLoading(true);
    try {
      const response = await apiService.request('/auth/oidc/config', 'GET', import.meta.env.VITE_BACKEND_URL || '');
      setOidcConfig(response);
    } catch (error) {
      console.error('Error fetching OIDC config:', error);
    } finally {
      setOidcLoading(false);
    }
  };

  const saveOidcConfig = async (config: Partial<OIDCConfig> & { clientSecret?: string }) => {
    setOidcSaving(true);
    try {
      const response = await apiService.request('/auth/oidc/config', 'POST', import.meta.env.VITE_BACKEND_URL || '', config);
      await fetchOidcConfig(); // Refresh the config
      setOidcTestResult(null);
      return response;
    } catch (error) {
      console.error('Error saving OIDC config:', error);
      throw error;
    } finally {
      setOidcSaving(false);
    }
  };

  const testOidcConnection = async (issuerUrl: string) => {
    setOidcTesting(true);
    try {
      const response = await apiService.request('/auth/oidc/test', 'POST', import.meta.env.VITE_BACKEND_URL || '', { issuerUrl });
      setOidcTestResult({ success: true, message: response.message, details: response.providerInfo });
    } catch (error: any) {
      setOidcTestResult({
        success: false,
        message: error.error || 'Connection test failed',
        details: error.details
      });
    } finally {
      setOidcTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span>General</span>
            </h3>

            <div className="bg-gray-750 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div>
                    <h4 className="font-medium">Stream Synchronization</h4>
                    <p className="text-sm text-gray-400">Keep stream playback in sync with your friends. This causes longer loading times.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={syncEnabled}
                    onChange={(e) => onSyncChange(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Admin Section */}
          {authenticated && user?.role === 'admin' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center space-x-2">
                <Shield className="w-5 h-5 text-orange-400" />
                <span>Admin Dashboard</span>
              </h3>

              {loading ? (
                <div className="bg-gray-750 rounded-lg p-4">
                  <div className="flex items-center justify-center py-4">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-gray-400">Loading stats...</span>
                  </div>
                </div>
              ) : adminStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* User Statistics */}
                  <div className="bg-gray-750 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Users className="w-5 h-5 text-green-400" />
                      <h4 className="font-medium">User Statistics</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Users:</span>
                        <span className="font-medium">{adminStats.totalUsers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Administrators:</span>
                        <span className="font-medium text-orange-400">{adminStats.adminCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Regular Users:</span>
                        <span className="font-medium text-blue-400">{adminStats.userCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* System Information */}
                  <div className="bg-gray-750 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Server className="w-5 h-5 text-purple-400" />
                      <h4 className="font-medium">System Info</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Channels:</span>
                        <span className="font-medium">{adminStats.totalChannels || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">SSO Enabled:</span>
                        <span className={`font-medium ${adminStats.ssoEnabled ? 'text-green-400' : 'text-red-400'}`}>
                          {adminStats.ssoEnabled ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Auth Backend:</span>
                        <span className="font-medium text-blue-400">Passport.js</span>
                      </div>
                    </div>
                  </div>

                  {/* Authentication Configuration */}
                  <div className="bg-gray-750 rounded-lg p-4 md:col-span-2">
                    <div className="flex items-center space-x-3 mb-3">
                      <Database className="w-5 h-5 text-yellow-400" />
                      <h4 className="font-medium">Authentication Status</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400 mb-1">Local Authentication:</p>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-green-400 font-medium">Active</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">SSO Authentication:</p>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${adminStats.ssoEnabled ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                          <span className={`font-medium ${adminStats.ssoEnabled ? 'text-green-400' : 'text-gray-400'}`}>
                            {adminStats.ssoEnabled ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* OIDC Configuration */}
              {oidcConfig && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium flex items-center space-x-2">
                    <Key className="w-5 h-5 text-indigo-400" />
                    <span>OIDC/SSO Configuration</span>
                  </h4>

                  <div className="bg-gray-750 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h5 className="font-medium">Single Sign-On (SSO)</h5>
                        <p className="text-sm text-gray-400">Configure OpenID Connect authentication</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${oidcConfig.enabled ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                          <span className={`text-sm font-medium ${oidcConfig.enabled ? 'text-green-400' : 'text-gray-400'}`}>
                            {oidcConfig.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <button
                          onClick={() => setShowOidcForm(!showOidcForm)}
                          className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors text-sm"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Configure</span>
                        </button>
                      </div>
                    </div>

                    {oidcConfig.enabled && oidcConfig.issuerUrl && (
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Provider:</span>
                          <span className="font-medium truncate ml-2 max-w-xs">{oidcConfig.issuerUrl}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Auto-provision Users:</span>
                          <span className={`font-medium ${oidcConfig.autoProvision ? 'text-green-400' : 'text-gray-400'}`}>
                            {oidcConfig.autoProvision ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Role Mapping:</span>
                          <span className={`font-medium ${oidcConfig.roleMapping ? 'text-green-400' : 'text-gray-400'}`}>
                            {oidcConfig.roleMapping ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    )}

                    {showOidcForm && (
                      <OidcConfigurationForm
                        config={oidcConfig}
                        onSave={saveOidcConfig}
                        onTest={testOidcConnection}
                        loading={oidcSaving}
                        testing={oidcTesting}
                        testResult={oidcTestResult}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Info Note */}
              <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-blue-300 font-medium mb-1">Admin Note</p>
                    <p className="text-blue-200">
                      As an administrator, you have access to user management and can modify channel configurations.
                      Use the User Management panel to view and modify user roles.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700">
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

// OIDC Configuration Form Component
interface OidcConfigFormProps {
  config: OIDCConfig;
  onSave: (config: Partial<OIDCConfig> & { clientSecret?: string }) => Promise<any>;
  onTest: (issuerUrl: string) => Promise<void>;
  loading: boolean;
  testing: boolean;
  testResult: { success: boolean; message: string; details?: any } | null;
}

function OidcConfigurationForm({ config, onSave, onTest, loading, testing, testResult }: OidcConfigFormProps) {
  const [formData, setFormData] = useState({
    enabled: config.enabled,
    issuerUrl: config.issuerUrl,
    clientId: config.clientId,
    clientSecret: '',
    autoProvision: config.autoProvision,
    roleMapping: config.roleMapping,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string; restartRequired?: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveResult(null);

    try {
      const response = await onSave(formData);
      setSaveResult({
        success: true,
        message: response.message || 'Configuration saved successfully!',
        restartRequired: response.restartRequired
      });
    } catch (error: any) {
      setSaveResult({
        success: false,
        message: error.error || 'Failed to save configuration'
      });
    }
  };

  const handleTest = async () => {
    if (formData.issuerUrl) {
      await onTest(formData.issuerUrl);
    }
  };

  return (
    <div className="mt-6 border-t border-gray-600 pt-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Enable OIDC/SSO</label>
            <p className="text-xs text-gray-400">Enable OpenID Connect single sign-on</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
          </label>
        </div>

        {/* Basic Configuration */}
        {formData.enabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Issuer URL <span className="text-red-400">*</span>
                </label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={formData.issuerUrl}
                    onChange={(e) => setFormData({ ...formData, issuerUrl: e.target.value })}
                    placeholder="https://auth.example.com/realms/streamhub"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing || !formData.issuerUrl}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 rounded-lg transition-colors text-sm flex items-center space-x-2"
                  >
                    {testing ? (
                      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    <span>{testing ? 'Testing...' : 'Test'}</span>
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  OIDC provider discovery endpoint (e.g., Authentik, Keycloak, Authelia)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Client ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    placeholder="streamhub-client"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Client Secret <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.clientSecret}
                    onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                    placeholder={config.clientId ? '••••••••' : 'Enter client secret'}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    required={!config.clientId}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Leave empty to keep current secret
                  </p>
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="border-t border-gray-600 pt-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center space-x-2 text-sm text-indigo-400 hover:text-indigo-300"
              >
                <span>Advanced Settings</span>
                <span className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div>
                        <h6 className="font-medium text-sm">Auto-provision Users</h6>
                        <p className="text-xs text-gray-400">Create new users automatically from SSO</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.autoProvision}
                          onChange={(e) => setFormData({ ...formData, autoProvision: e.target.checked })}
                        />
                        <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div>
                        <h6 className="font-medium text-sm">Role Mapping</h6>
                        <p className="text-xs text-gray-400">Map OIDC groups to user roles</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={formData.roleMapping}
                          onChange={(e) => setFormData({ ...formData, roleMapping: e.target.checked })}
                        />
                        <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                      </label>
                    </div>
                  </div>

                  {formData.roleMapping && (
                    <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded-lg p-3">
                      <p className="text-sm text-yellow-200">
                        <strong>Role Mapping Groups:</strong> Configure your OIDC provider to include these groups:
                      </p>
                      <ul className="text-sm text-yellow-300 mt-2 space-y-1 list-disc list-inside">
                        <li><code className="bg-gray-800 px-2 py-1 rounded">streamhub-admins</code> - Admin users</li>
                        <li><code className="bg-gray-800 px-2 py-1 rounded">streamhub-users</code> - Regular users</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Test Results */}
        {testResult && (
          <div className={`p-4 rounded-lg border ${testResult.success
            ? 'bg-green-900 bg-opacity-20 border-green-700'
            : 'bg-red-900 bg-opacity-20 border-red-700'
          }`}>
            <div className="flex items-start space-x-3">
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              )}
              <div className="text-sm">
                <p className={`font-medium ${testResult.success ? 'text-green-300' : 'text-red-300'}`}>
                  {testResult.message}
                </p>
                {testResult.details && (
                  <pre className="mt-2 text-xs text-gray-400 bg-gray-800 p-2 rounded overflow-x-auto">
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Save Results */}
        {saveResult && (
          <div className={`p-4 rounded-lg border ${saveResult.success
            ? 'bg-green-900 bg-opacity-20 border-green-700'
            : 'bg-red-900 bg-opacity-20 border-red-700'
          }`}>
            <div className="flex items-start space-x-3">
              {saveResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              )}
              <div className="text-sm">
                <p className={`font-medium ${saveResult.success ? 'text-green-300' : 'text-red-300'}`}>
                  {saveResult.message}
                </p>
                {saveResult.restartRequired && (
                  <p className="mt-1 text-yellow-300">
                    ⚠️ Server restart required for OIDC changes to take effect
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-600">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            <span>{loading ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>

        {/* Callback URL Info */}
        {formData.enabled && config.callbackUrl && (
          <div className="bg-gray-700 rounded-lg p-4 mt-4">
            <h6 className="font-medium text-sm mb-2">Redirect/Callback URL</h6>
            <div className="flex items-center space-x-2">
              <code className="flex-1 bg-gray-800 px-3 py-2 rounded text-sm font-mono text-green-400">
                {config.callbackUrl}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(config.callbackUrl)}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Configure this URL in your OIDC provider as the redirect/callback URL
            </p>
          </div>
        )}
      </form>
    </div>
  );
}

export default SettingsModal;