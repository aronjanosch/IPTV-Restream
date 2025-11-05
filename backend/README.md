# Backend

A simple NodeJS web server that is able to proxy and restream your any iptv stream/playlist and manage multiple playlists.

## 🚀 Run

It is strongly advised to [use the frontend together with the backend](../deployment/README.md). 


If you still want to use it standalone, consider these options:

### With Docker (Preferred)

In this directory:
```bash
docker build -t iptv_restream_backend
```

```bash
docker run -d \
  -v {streams_directory}:/streams \
  -e STORAGE_PATH=/streams \
  iptv_restream_backend
```
make sure that you have created a directory for the streams storage:
e.g. create `/streams` and replace `{streams_directory}` with it.

### Bare metal

Setup a `.env` file or 
equivalent environment variables:
```env
STORAGE_PATH=/mnt/streams/recordings
```

The storage directory has to exist. There will be alot of I/O, so it makes sense to mount the storage into ram memory.

Before running, make sure you have `ffmpeg` installed on your system.

```bash
node index.js
```
Be aware, that this application is designed for Linux systems!

To use together with the frontend, [run with docker](../README.md#run-with-docker-preferred).

## 🛠️ Endpoints

### API

#### [ChannelController](./controllers/ChannelController.js)

- GET: `/api/channels/:channelId` and `/api/channels` to get information about the registered channels.
- GET: `/api/channels/current` to get the currently playing channel.
- PUT: `api/channels/:channelId` to update a channel.
- DELETE: `api/channels/:channelId` to delete a channel.
- POST: `api/channels` to create a new channel.

#### [ProxyController](./controllers/ProxyController.js)

- `/proxy/channel` to get the M3U File of the current channel
- `/proxy/segment` and `/proxy/key` will be used by the iptv player directly

#### Restream

- `/streams/{currentChannelId}/{currentChannelId}.m3u` to access the current restream.

### WebSocket

- `channel-added` and `channel-selected` events will be send to all connected clients
- chat messages: `send-chat-message` and `chat-message`
- users: `user-connected` and `user-disconnected`

## ℹ️ Usage without the frontend (with other iptv player)
You can use all the channels with any other IPTV player. The backend exposes a **M3U Playlist** on `http://your-domain/api/channels/playlist`. You can also find it by clicking on the TV-button on the top right in the frontend!
If this playlist does not work, please check if the base-url of the channels in the playlist is correct and set the `BACKEND_URL` in the `docker-compose.yml` if not.

This playlist contains all your channels and one **CURRENT_CHANNEL**, which forwards the content of the currently played channel.

To modify the channel list, you can use the frontend or the [api](#channelcontroller).

> [!NOTE]
> These options are only tested with VLC media player as other iptv player. Use them at your own risk. Only for the usage together with the frontend will be support provided.
