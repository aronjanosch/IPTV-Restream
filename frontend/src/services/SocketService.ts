import { io, Socket } from 'socket.io-client';
import { ChannelMode } from '../types';

class SocketService {
  private socket: Socket | null = null;

  private listeners: Map<string, ((data: any) => void)[]> = new Map();

  // Initialize
  connect() {
    if (this.socket?.connected) return;

    console.log('Connecting to WebSocket server: ');
    // Default Behavior: If 'VITE_BACKEND_URL' is not set, the app will use the same host name as the frontend
    this.socket = io(import.meta.env.VITE_BACKEND_URL);

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    this.socket.on('app-error', (error) => {
      console.error('Failed:', error);
    });


    // Listen for incoming custom events
    this.socket.onAny((event: string, data: any) => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.forEach((listener) => listener(data));
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribeToEvent<T>(event: string, listener: (data: T) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(listener);
  }

  // Unsubscribe from event
  unsubscribeFromEvent<T>(event: string, listener: (data: T) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      this.listeners.set(
        event,
        eventListeners.filter((existingListener) => existingListener !== listener)
      );
    }
  }


  // Send chat message
  sendMessage(userName: string, userAvatar: string, message: string, timestamp: string) {
    if (!this.socket) throw new Error('Socket is not connected.');

    this.socket.emit('send-message', { userName, userAvatar, message, timestamp });
  }

  // Add channel
  addChannel(name: string, url: string, avatar: string, mode: ChannelMode, headersJson: string, isAdmin: boolean = false) {
    if (!this.socket) throw new Error('Socket is not connected.');

    this.socket.emit('add-channel', { name, url, avatar, mode, headersJson, isAdmin });
  }

  // Set current channel
  setCurrentChannel(id: number) {
    if (!this.socket) throw new Error('Socket is not connected.');

    this.socket.emit('set-current-channel', id);
  }

  // Delete channel
  deleteChannel(id: number, isAdmin: boolean = false) {
    if (!this.socket) throw new Error('Socket is not connected.');

    this.socket.emit('delete-channel', { id, isAdmin });
  }

  // Update channel
  updateChannel(id: number, updatedAttributes: any, isAdmin: boolean = false) {
    if (!this.socket) throw new Error('Socket is not connected.');

    this.socket.emit('update-channel', { id, updatedAttributes, isAdmin });
  }

  // Add playlist
  addPlaylist(playlist: string, playlistName: string, mode: ChannelMode, playlistUpdate: boolean, headers: string, isAdmin: boolean = false) {
    if (!this.socket) throw new Error('Socket is not connected.');

    this.socket.emit('add-playlist', { playlist, playlistName, mode, playlistUpdate, headers, isAdmin });
  }

  // Update playlist
  updatePlaylist(playlist: string, updatedAttributes: any, isAdmin: boolean = false) {
    if (!this.socket) throw new Error('Socket is not connected.');

    this.socket.emit('update-playlist', { playlist, updatedAttributes, isAdmin });
  }

  // Delete playlist 
  deletePlaylist(playlist: string, isAdmin: boolean = false) {
    if (!this.socket) throw new Error('Socket is not connected.');

    this.socket.emit('delete-playlist', { playlist, isAdmin });
  }

}

const socketService = new SocketService();
export default socketService;