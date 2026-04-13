import React, { useState } from 'react';
import { Channel } from '../types';
import socketService from '../services/SocketService';
import { Plus, Tv2, ChevronDown, Search } from 'lucide-react';

interface ChannelBrowserProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  onEditChannel: (channel: Channel) => void;
  isAdmin?: boolean;
  playlists: string[];
  groups: string[];
  selectedPlaylist: string;
  selectedGroup: string;
  onPlaylistChange: (playlist: string) => void;
  onGroupChange: (group: string) => void;
  onAddChannel: () => void;
}

function ChannelBrowser({
  channels,
  selectedChannel,
  searchQuery,
  setSearchQuery,
  onEditChannel,
  isAdmin = false,
  playlists,
  groups,
  selectedPlaylist,
  selectedGroup,
  onPlaylistChange,
  onGroupChange,
  onAddChannel,
}: ChannelBrowserProps) {
  const [isPlaylistDropdownOpen, setIsPlaylistDropdownOpen] = useState(false);

  const onSelectChannel = (channel: Channel) => {
    setSearchQuery('');
    if (channel.id === selectedChannel?.id) return;
    socketService.setCurrentChannel(channel.id);
  };

  const onRightClickChannel = (event: React.MouseEvent, channel: Channel) => {
    event.preventDefault();
    onEditChannel(channel);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      {/* Search input */}
      <div className="relative mb-3">
        <input
          type="text"
          placeholder="Search channels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-700 text-gray-100 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
        />
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
      </div>

      {/* Header: playlist dropdown + add button */}
      <div className="flex items-center justify-between mb-3">
        <div className="relative">
          <button
            onClick={() => setIsPlaylistDropdownOpen(!isPlaylistDropdownOpen)}
            className="flex items-center space-x-2 group"
          >
            <Tv2 className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium group-hover:text-blue-400 transition-colors">
              {selectedPlaylist}
            </span>
            <ChevronDown
              className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
                isPlaylistDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isPlaylistDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 overflow-hidden">
              <div className="max-h-60 overflow-y-auto scroll-container">
                {playlists.map((playlist) => (
                  <button
                    key={playlist}
                    onClick={() => {
                      onPlaylistChange(playlist);
                      setIsPlaylistDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-700 ${
                      selectedPlaylist === playlist
                        ? 'text-blue-400 font-semibold'
                        : 'text-gray-200'
                    }`}
                    style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}
                  >
                    {playlist}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {isAdmin && (
          <button
            onClick={onAddChannel}
            className="p-1.5 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category pills */}
      <div className="flex space-x-2 overflow-x-auto pb-2 mb-3 scroll-container">
        {groups.map((group) => (
          <button
            key={group}
            onClick={() => onGroupChange(group)}
            className={`whitespace-nowrap flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedGroup === group
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {group === 'Category' ? 'All' : group}
          </button>
        ))}
      </div>

      {/* Channel grid */}
      {channels.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No channels found</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2 overflow-y-auto max-h-[calc(100vh-280px)] lg:max-h-72 scroll-container">
          {channels.map((channel) => (
            <button
              key={channel.id}
              title={channel.name}
              onClick={() => onSelectChannel(channel)}
              onContextMenu={(e) => onRightClickChannel(e, channel)}
              className={`group flex flex-col items-center p-2 rounded-lg transition-all ${
                selectedChannel?.id === channel.id
                  ? 'bg-blue-500 bg-opacity-20 ring-2 ring-blue-500'
                  : 'hover:bg-gray-700'
              }`}
            >
              <img
                src={channel.avatar}
                alt={channel.name}
                className="w-12 h-12 object-contain rounded mb-1 transition-transform group-hover:scale-105"
              />
              <span className="text-xs text-center leading-tight line-clamp-2 w-full">
                {channel.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ChannelBrowser;
