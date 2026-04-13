import { X, Copy, Tv2, User } from 'lucide-react';
import { useContext, useEffect, useState } from 'react';
import { ToastContext } from './notifications/ToastContext';
import { useAdmin } from './admin/AdminContext';
import apiService from '../services/ApiService';

interface TvPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

function TvPlaylistModal({ isOpen, onClose, isAdmin = false }: TvPlaylistModalProps) {
  const { addToast } = useContext(ToastContext);
  const { username } = useAdmin();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
  const publicPlaylistUrl = `${backendUrl}/api/channels/playlist`;

  const [personalUrl, setPersonalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !username) return;
    apiService.request<{ token: string }>('/auth/stream-token')
      .then(({ token }) => {
        setPersonalUrl(`${backendUrl}/api/channels/playlist/${username}/${token}`);
      })
      .catch(() => setPersonalUrl(null));
  }, [isOpen, username, backendUrl]);

  if (!isOpen) return null;

  const handleCopy = async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url);
      addToast({ type: 'success', title: `${label} copied to clipboard`, duration: 2500 });
    } catch {
      addToast({ type: 'error', title: 'Failed to copy URL', message: 'Please copy the URL manually', duration: 2500 });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Tv2 className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-semibold">TV Playlist</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Personal playlist URL */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <User className="w-4 h-4" />
              <span>Your personal playlist</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={personalUrl ?? 'Loading…'}
                readOnly
                className="flex-1 bg-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => personalUrl && handleCopy(personalUrl, 'Personal playlist URL')}
                disabled={!personalUrl}
                className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              This link is unique to your account. Paste it into any IPTV app — no password needed.
            </p>
          </div>

          {/* Public playlist URL */}
          <div className="space-y-2 border-t border-gray-700 pt-4">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Tv2 className="w-4 h-4" />
              <span>Public playlist (no auth)</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={publicPlaylistUrl}
                readOnly
                className="flex-1 bg-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => handleCopy(publicPlaylistUrl, 'Playlist URL')}
                className="p-2 bg-gray-600 rounded-lg hover:bg-gray-500 transition-colors"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-400">
              If your player can't handle the personal URL, check that BACKEND_URL is set correctly in docker-compose.yml.
            </p>
          </div>

          {isAdmin && (
            <div className="border-t border-gray-700 pt-4">
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-300">
                  Each user's personal URL embeds their username and a token derived from <code className="text-blue-400">STREAM_TOKEN_SECRET</code>. No DB storage needed — the token is verified server-side on every request.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TvPlaylistModal;
