import { useState, useEffect, useMemo, useContext } from 'react';
import { Search, Settings, Users, Radio, Tv2, Shield, User } from 'lucide-react';
import VideoPlayer from './components/VideoPlayer';
import ChannelBrowser from './components/ChannelBrowser';
import Chat from './components/chat/Chat';
import ChannelModal from './components/add_channel/ChannelModal';
import { Channel } from './types';
import socketService from './services/SocketService';
import apiService from './services/ApiService';
import SettingsModal from './components/SettingsModal';
import TvPlaylistModal from './components/TvPlaylistModal';
import { ToastProvider, ToastContext } from './components/notifications/ToastContext';
import ToastContainer from './components/notifications/ToastContainer';
import { AdminProvider, useAdmin } from './components/admin/AdminContext';
import AdminModal from './components/admin/AdminModal';
import LoginPage from './components/auth/LoginPage';

function AppContent() {
  const { isLoggedIn } = useAdmin();

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  return <AppMain />;
}

function AppMain() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTvPlaylistOpen, setIsTvPlaylistOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(() => {
    const savedValue = localStorage.getItem('syncEnabled');
    return savedValue !== null ? JSON.parse(savedValue) : false;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [editChannel, setEditChannel] = useState<Channel | null>(null);

  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('All Channels');
  const [selectedGroup, setSelectedGroup] = useState<string>('Category');

  const { isAdmin, username } = useAdmin();
  const { addToast } = useContext(ToastContext);

  // Get unique playlists from channels
  const playlists = useMemo(() => {
    const uniquePlaylists = new Set(channels.map(channel => channel.playlistName).filter(playlistName => playlistName !== null));
    return ['All Channels', ...Array.from(uniquePlaylists)];
  }, [channels]);

  const filteredChannels = useMemo(() => {
    //Filter by playlist
    let filteredByPlaylist = selectedPlaylist === 'All Channels' ? channels : channels.filter(channel =>
      channel.playlistName === selectedPlaylist
    );

    //Filter by group
    filteredByPlaylist = selectedGroup === 'Category' ? filteredByPlaylist : filteredByPlaylist.filter(channel =>
      channel.group === selectedGroup
    );

    //Filter by name search
    return filteredByPlaylist.filter(channel =>
      channel.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [channels, selectedPlaylist, selectedGroup, searchQuery]);

  const groups = useMemo(() => {
    let uniqueGroups;
    if (selectedPlaylist === 'All Channels') {
      uniqueGroups = new Set(channels.map(channel => channel.group).filter(group => group !== null));
    } else {
      uniqueGroups = new Set(channels.filter(channel => channel.group !== null && channel.playlistName === selectedPlaylist).map(channel => channel.group));
    }
    return ['Category', ...Array.from(uniqueGroups)];
  }, [selectedPlaylist, channels]);

  useEffect(() => {
    apiService
      .request<Channel[]>('/channels/', 'GET')
      .then((data) => setChannels(data))
      .catch((error) => console.error('Error loading channels:', error));

    apiService
      .request<Channel>('/channels/current', 'GET')
      .then((data) => setSelectedChannel(data))
      .catch((error) => console.error('Error loading current channel:', error));

    console.log('Subscribing to events');
    const channelAddedListener = (channel: Channel) => {
      setChannels((prevChannels) => [...prevChannels, channel]);
    };

    const channelsAddedListener = (newChannels: Channel[]) => {
      setChannels((prevChannels) => [...prevChannels, ...newChannels]);
    };

    const channelSelectedListener = (nextChannel: Channel) => {
      setSelectedChannel(nextChannel);
    };

    const channelUpdatedListener = (updatedChannel: Channel) => {
      setChannels((prevChannels) =>
        prevChannels.map((channel) =>
          channel.id === updatedChannel.id ?
            updatedChannel : channel
        )
      );

      setSelectedChannel((selectedChannel: Channel | null) => {
        if (selectedChannel?.id === updatedChannel.id) {
          // Reload stream if the stream attributes (url, headers) have changed
          if (
            (selectedChannel?.url != updatedChannel.url ||
              JSON.stringify(selectedChannel?.headers) !=
              JSON.stringify(updatedChannel.headers)) &&
            selectedChannel?.mode === 'restream'
          ) {
            //TODO: find a better solution instead of reloading (problem is m3u8 needs time to refresh server-side)
            setTimeout(() => {
              window.location.reload();
            }, 3000);
          }
          return updatedChannel;
        }
        return selectedChannel;
      });
    };

    const channelDeletedListener = (deletedChannel: number) => {
      setChannels((prevChannels) =>
        prevChannels.filter((channel) => channel.id !== deletedChannel)
      );
    };

    const errorListener = (error: { message: string }) => {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message,
        duration: 5000,
      });
    };

    socketService.subscribeToEvent('channel-added', channelAddedListener);
    socketService.subscribeToEvent('channels-added', channelsAddedListener);
    socketService.subscribeToEvent('channel-selected', channelSelectedListener);
    socketService.subscribeToEvent('channel-updated', channelUpdatedListener);
    socketService.subscribeToEvent('channel-deleted', channelDeletedListener);
    socketService.subscribeToEvent('app-error', errorListener);

    socketService.connect();

    return () => {
      socketService.unsubscribeFromEvent('channel-added', channelAddedListener);
      socketService.unsubscribeFromEvent('channels-added', channelsAddedListener);
      socketService.unsubscribeFromEvent(
        'channel-selected',
        channelSelectedListener
      );
      socketService.unsubscribeFromEvent(
        'channel-updated',
        channelUpdatedListener
      );
      socketService.unsubscribeFromEvent(
        'channel-deleted',
        channelDeletedListener
      );
      socketService.unsubscribeFromEvent('app-error', errorListener);
      socketService.disconnect();
      console.log('WebSocket connection closed');
    };
  }, []);

  const handleEditChannel = (channel: Channel) => {
    // Only allow editing if admin mode is not enabled or user is admin
    if (isAdmin) {
      setEditChannel(channel);
      setIsModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto py-4">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Radio className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold">StreamHub</h1>

            {isAdmin && (
              <span className="ml-2 flex items-center px-2 py-1 text-xs font-medium text-green-400 bg-green-400 bg-opacity-10 rounded-full border border-green-400">
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </span>
            )}
          </div>
          <div className="relative max-w-md w-full">
            <input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>
          <div className="flex items-center space-x-4">
            <Users className="w-6 h-6 text-blue-500" />
            <button
              onClick={() => setIsTvPlaylistOpen(true)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Tv2 className="w-6 h-6 text-blue-500" />
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Settings className="w-6 h-6 text-blue-500" />
            </button>
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors flex items-center space-x-1"
              title={username ?? ''}
            >
              {isAdmin
                ? <Shield className="w-6 h-6 text-green-500" />
                : <User className="w-6 h-6 text-blue-400" />
              }
            </button>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <VideoPlayer channel={selectedChannel} syncEnabled={syncEnabled} />

            <ChannelBrowser
              channels={filteredChannels}
              selectedChannel={selectedChannel}
              setSearchQuery={setSearchQuery}
              onEditChannel={handleEditChannel}
              isAdmin={isAdmin}
              playlists={playlists}
              groups={groups}
              selectedPlaylist={selectedPlaylist}
              selectedGroup={selectedGroup}
              onPlaylistChange={(playlist) => {
                setSelectedPlaylist(playlist);
                setSelectedGroup('Category');
              }}
              onGroupChange={setSelectedGroup}
              onAddChannel={() => setIsModalOpen(true)}
            />
          </div>

          <div className="col-span-12 lg:col-span-4">
            <Chat />
          </div>
        </div>
      </div>

      {isModalOpen && (
        <ChannelModal
          onClose={() => {
            setIsModalOpen(false);
            setEditChannel(null);
          }}
          channel={editChannel}
          isAdmin={isAdmin}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        syncEnabled={syncEnabled}
        onSyncChange={(enabled) => {
          setSyncEnabled(enabled);
          localStorage.setItem('syncEnabled', JSON.stringify(enabled));
        }}
      />

      <TvPlaylistModal
        isOpen={isTvPlaylistOpen}
        onClose={() => setIsTvPlaylistOpen(false)}
        isAdmin={isAdmin}
      />

      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      <ToastContainer />
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AdminProvider>
        <AppContent />
      </AdminProvider>
    </ToastProvider>
  );
}

export default App;