const express = require('express');
const session = require('express-session');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

const ChatSocketHandler = require('./socket/ChatSocketHandler');
const ChannelSocketHandler = require('./socket/ChannelSocketHandler');

const proxyController = require('./controllers/ProxyController');
const centralChannelController = require('./controllers/CentralChannelController');
const channelController = require('./controllers/ChannelController');
const streamController = require('./services/restream/StreamController');
const ChannelService = require('./services/ChannelService');
const PlaylistSocketHandler = require('./socket/PlaylistSocketHandler');
const PlaylistUpdater = require('./services/PlaylistUpdater');

// Authentication
const passport = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const { requireAdmin, authEnabledOrAuthenticated } = require('./middleware/authorize');

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Authentication routes
app.use('/auth', authRoutes);

const apiRouter = express.Router();
apiRouter.get('/', channelController.getChannels);
apiRouter.get('/current', channelController.getCurrentChannel);
apiRouter.delete('/clear', requireAdmin, channelController.clearChannels);
apiRouter.get('/playlist', centralChannelController.playlist);
apiRouter.get('/:channelId', channelController.getChannel);
apiRouter.delete('/:channelId', requireAdmin, channelController.deleteChannel);
apiRouter.put('/:channelId', requireAdmin, channelController.updateChannel);
apiRouter.post('/', requireAdmin, channelController.addChannel);
app.use('/api/channels', apiRouter);

const proxyRouter = express.Router();
proxyRouter.get('/channel', authEnabledOrAuthenticated, proxyController.channel);
proxyRouter.get('/segment', authEnabledOrAuthenticated, proxyController.segment);
proxyRouter.get('/key', authEnabledOrAuthenticated, proxyController.key);
proxyRouter.get('/current', authEnabledOrAuthenticated, centralChannelController.currentChannel);
app.use('/proxy', proxyRouter);


const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, async () => {
  console.log(`Server listening on Port ${PORT}`);
  if (ChannelService.getCurrentChannel().restream()) {
    await streamController.start(ChannelService.getCurrentChannel());
  }
  PlaylistUpdater.startScheduler();
  PlaylistUpdater.registerChannelsPlaylist(ChannelService.getChannels());
});


// Web Sockets
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:8080', 'http://localhost:3000'],
    credentials: true
  }
});

const connectedUsers = {};

io.on('connection', socket => {
  console.log('New client connected');

  socket.on('new-user', userId => {
    connectedUsers[socket.id] = userId;
    socket.broadcast.emit('user-connected', userId);
  })

  socket.on('disconnect', () => {
    socket.broadcast.emit('user-disconnected', connectedUsers[socket.id]);
    delete connectedUsers[socket.id];
  })

  ChannelSocketHandler(io, socket);
  PlaylistSocketHandler(io, socket);

  ChatSocketHandler(io, socket);
})
