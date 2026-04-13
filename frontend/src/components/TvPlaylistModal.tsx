import { X, Copy, Tv2 } from 'lucide-react';
import { useContext, useEffect, useState } from 'react';
import { ToastContext } from './notifications/ToastContext';
import { useAdmin } from './admin/AdminContext';
import apiService from '../services/ApiService';

interface TvPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

function TvPlaylistModal({ isOpen, onClose }: TvPlaylistModalProps) {
  const { addToast } = useContext(ToastContext);
  const { username } = useAdmin();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;

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

  const handleCopy = async () => {
    if (!personalUrl) return;
    try {
      await navigator.clipboard.writeText(personalUrl);
      addToast({ type: 'success', title: 'Playlist URL copied to clipboard', duration: 2500 });
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

        <div className="p-6">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={personalUrl ?? 'Loading…'}
              readOnly
              className="flex-1 bg-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCopy}
              disabled={!personalUrl}
              className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TvPlaylistModal;
