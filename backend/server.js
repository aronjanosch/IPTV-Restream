const express = require('express');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

const ChatSocketHandler = require('./socket/ChatSocketHandler');
const ChannelSocketHandler = require('./socket/ChannelSocketHandler');
const PlaylistSocketHandler = require('./socket/PlaylistSocketHandler');
const socketAuthMiddleware = require('./socket/middleware/jwt');

const proxyController = require('./controllers/ProxyController');
const centralChannelController = require('./controllers/CentralChannelController');
const channelController = require('./controllers/ChannelController');
const authController = require('./controllers/AuthController');
const streamController = require('./services/restream/StreamController');
const ChannelService = require('./services/ChannelService');
const PlaylistUpdater = require('./services/PlaylistUpdater');

dotenv.config();

const app = express();
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Auth routes
const authRouter = express.Router();
authRouter.post('/admin-login', authController.adminLogin);
authRouter.get('/admin-status', authController.checkAdminStatus);

app.use('/api/auth', authRouter);

// Channel routes
const apiRouter = express.Router();
apiRouter.get('/', channelController.getChannels);
apiRouter.get('/current', channelController.getCurrentChannel);
apiRouter.delete('/clear', authController.verifyToken, channelController.clearChannels);
apiRouter.get('/playlist', centralChannelController.playlist);
apiRouter.get('/:channelId', channelController.getChannel);
// Protected routes
apiRouter.delete('/:channelId', authController.verifyToken, channelController.deleteChannel);
apiRouter.put('/:channelId', authController.verifyToken, channelController.updateChannel);
apiRouter.post('/', authController.verifyToken, channelController.addChannel);
app.use('/api/channels', apiRouter);

const basicAuth = require('./middleware/basicAuth');
const path = require('path');
const fs = require('fs');

// Serve compiled frontend from /public
app.use(express.static(path.join(__dirname, 'public')));

const proxyRouter = express.Router();
proxyRouter.use(basicAuth);
proxyRouter.get('/channel', proxyController.channel);
proxyRouter.get('/segment', proxyController.segment);
proxyRouter.get('/key', proxyController.key);
proxyRouter.get('/current', centralChannelController.currentChannel);
app.use('/proxy', proxyRouter);

// Streams route with optional Basic Auth support
const streamsRouter = express.Router();
streamsRouter.use(basicAuth);
streamsRouter.get('/:channelId/:filename', (req, res) => {
    const { channelId, filename } = req.params;
    const storagePath = process.env.STORAGE_PATH || '/streams/';
    const filePath = path.join(storagePath, channelId, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    // Set appropriate headers
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Range',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    });
    
    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.ts') {
        res.set('Content-Type', 'video/mp2t');
    } else if (ext === '.m3u8') {
        res.set('Content-Type', 'application/vnd.apple.mpegurl');
    }
    
    // Stream the file
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    
    stream.on('error', (err) => {
        console.error('Stream error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Stream error' });
        }
    });
});
app.use('/streams', streamsRouter);

// SPA fallback — serve index.html for any route not matched above
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 5000;
const server = app.listen(PORT, async () => {
  console.log(`Server listening on Port ${PORT}`);
  // Don't automatically start streaming - wait for viewers to connect
  PlaylistUpdater.startScheduler();
  PlaylistUpdater.registerChannelsPlaylist(ChannelService.getChannels());
});


// Web Sockets with explicit CORS configuration
const io = new Server(server, {
  cors: {
    origin: "*", // Allow any origin in development
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  },
});

// Add JWT authentication middleware to socket.io
io.use(socketAuthMiddleware);

const connectedUsers = {};

io.on('connection', socket => {
  console.log('New client connected');

  // Handle viewer connection - start streaming if first viewer
  ChannelService.viewerConnected().then(streamStarted => {
    if (streamStarted) {
      // Notify all clients that streaming has started
      io.emit('stream-status-changed', {
        status: 'started',
        channelId: ChannelService.getCurrentChannel().id
      });
    }
  });

  socket.on('new-user', userId => {
    connectedUsers[socket.id] = userId;
    socket.broadcast.emit('user-connected', userId);
  });

  socket.on('disconnect', () => {
    // Handle viewer disconnection - stop streaming if no viewers
    ChannelService.viewerDisconnected().then(streamStopped => {
      if (streamStopped) {
        // Notify all clients that streaming has stopped
        io.emit('stream-status-changed', {
          status: 'stopped',
          channelId: ChannelService.getCurrentChannel().id
        });
      }
    });

    socket.broadcast.emit('user-disconnected', connectedUsers[socket.id]);
    delete connectedUsers[socket.id];
  });

  ChannelSocketHandler(io, socket);
  PlaylistSocketHandler(io, socket);
  ChatSocketHandler(io, socket);
});